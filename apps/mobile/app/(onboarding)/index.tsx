import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  applyLocalFoundationSetup,
  createFoundationSetup,
  farmCalendarDateString,
  initialStageForMaterial,
  type StartMaterial,
} from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { strings } = useMobileLocale();
  const ob = strings.onboardingScreen;
  const { supabase, authLoading, userId, farms, farmListReady, refetchAll, updateLocalWorkspace, localWorkspace } =
    useFarmContext();
  const [farmName, setFarmName] = useState('');
  const [cycleName, setCycleName] = useState('Cycle 1');
  const [cultivar, setCultivar] = useState('');
  const [startMaterial, setStartMaterial] = useState<StartMaterial>('seed');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const tz =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  useEffect(() => {
    if (userId && farmListReady && farms.length > 0) {
      router.replace('/(tabs)');
    }
  }, [userId, farmListReady, farms.length, router]);

  async function saveLocal() {
    const start = farmCalendarDateString(tz);
    const stage = initialStageForMaterial(startMaterial);
    await updateLocalWorkspace((store) =>
      applyLocalFoundationSetup(store, {
        farmName: farmName.trim(),
        timezone: tz,
        cycleName: cycleName.trim() || 'Cycle 1',
        cultivarName: cultivar.trim() || null,
        startDate: start,
        stage,
        startMaterial,
        lightHoursOn: 18,
        lightHoursOff: 6,
        lightsOnAt: '06:00',
      }),
    );
    await refetchAll();
    router.replace('/(tabs)');
  }

  async function handleLocalCreate() {
    if (!farmName.trim()) {
      setError(ob.farmNameRequired);
      return;
    }
    setError(null);
    if ((localWorkspace?.journal.length ?? 0) > 0) {
      Alert.alert(ob.title, strings.cycle.localNewCycleWarning, [
        { text: strings.commonMobile.cancel, style: 'cancel' },
        {
          text: ob.startOnDevice,
          onPress: () => {
            setPending(true);
            void saveLocal()
              .catch((err: unknown) => setError(err instanceof Error ? err.message : ob.setupFailed))
              .finally(() => setPending(false));
          },
        },
      ]);
      return;
    }
    setPending(true);
    try {
      await saveLocal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : ob.setupFailed);
    } finally {
      setPending(false);
    }
  }

  async function handleCloudCreate() {
    if (!userId || !farmName.trim()) return;
    setError(null);
    setPending(true);
    try {
      const start = farmCalendarDateString(tz);
      const stage = initialStageForMaterial(startMaterial);
      await createFoundationSetup(supabase, {
        farmName: farmName.trim(),
        timezone: tz,
        cycleName: cycleName.trim() || 'Cycle 1',
        cultivarName: cultivar.trim() || undefined,
        startDate: start,
        stage,
      });
      await refetchAll();
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : ob.setupFailed);
    } finally {
      setPending(false);
    }
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{ob.title}</Text>
        <Text style={styles.subtitle}>{ob.subtitle}</Text>

        <Text style={styles.label}>{ob.farmName}</Text>
        <TextInput
          style={styles.input}
          value={farmName}
          onChangeText={setFarmName}
          placeholder={ob.farmNamePlaceholder}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        <Text style={styles.label}>{ob.cycleName}</Text>
        <TextInput
          style={styles.input}
          value={cycleName}
          onChangeText={setCycleName}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        <Text style={styles.label}>{ob.cultivar}</Text>
        <TextInput
          style={styles.input}
          value={cultivar}
          onChangeText={setCultivar}
          placeholder={ob.cultivarOptional}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        <Text style={styles.label}>{ob.startMaterial}</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, startMaterial === 'seed' && styles.chipActive]}
            onPress={() => setStartMaterial('seed')}
          >
            <Text style={[styles.chipText, startMaterial === 'seed' && styles.chipTextActive]}>
              {ob.fromSeed}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, startMaterial === 'clone' && styles.chipActive]}
            onPress={() => setStartMaterial('clone')}
          >
            <Text style={[styles.chipText, startMaterial === 'clone' && styles.chipTextActive]}>
              {ob.fromClone}
            </Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, pending && styles.buttonDisabled]}
          onPress={() => void handleLocalCreate()}
          disabled={pending}
        >
          <Text style={styles.buttonText}>{pending ? ob.creating : ob.startOnDevice}</Text>
        </Pressable>

        {userId ? (
          <Pressable
            style={[styles.buttonSecondary, pending && styles.buttonDisabled]}
            onPress={() => void handleCloudCreate()}
            disabled={pending}
          >
            <Text style={styles.buttonSecondaryText}>{ob.startInCloud}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.link} onPress={() => router.push('/(auth)/login?reason=sync')}>
            <Text style={styles.linkText}>{ob.signInForSync}</Text>
          </Pressable>
        )}

        <Pressable style={styles.skip} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>{ob.continueDefault}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.screen },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.screen },
    container: { padding: 24, paddingTop: 48, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 15, color: c.textMuted, marginBottom: 24, marginTop: 8, lineHeight: 21 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: c.text },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      color: c.text,
    },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 15, color: c.text, fontWeight: '500' },
    chipTextActive: { color: c.primaryText },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonSecondary: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    buttonSecondaryText: { color: c.text, fontSize: 16, fontWeight: '600' },
    link: { marginTop: 16, alignItems: 'center' },
    linkText: { color: c.primary, fontSize: 15, fontWeight: '600' },
    error: { color: c.dangerText, marginBottom: 8 },
    skip: { marginTop: 20, alignItems: 'center' },
    skipText: { color: c.textMuted, fontSize: 15, textDecorationLine: 'underline' },
  });
}
