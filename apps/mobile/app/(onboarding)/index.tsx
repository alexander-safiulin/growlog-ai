import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { createFoundationSetup } from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  const { supabase, authLoading, userId, farms, farmListReady, refetchAll } = useFarmContext();
  const [farmName, setFarmName] = useState('');
  const [cycleName, setCycleName] = useState('Cycle 1');
  const [cultivar, setCultivar] = useState('');
  const [stage, setStage] = useState('veg');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const tz =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  useEffect(() => {
    if (authLoading) return;
    if (!userId) router.replace('/(auth)/login');
  }, [authLoading, userId, router]);

  useEffect(() => {
    if (farmListReady && farms.length > 0) {
      router.replace('/(tabs)');
    }
  }, [farmListReady, farms.length, router]);

  function handleSkip() {
    router.replace('/(tabs)');
  }

  async function handleCreate() {
    if (!userId || !farmName.trim()) return;
    setError(null);
    setPending(true);
    try {
      const start = new Date().toISOString().slice(0, 10);
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
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setPending(false);
    }
  }

  if (authLoading || !userId) {
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
        <Text style={styles.title}>Set up your farm</Text>
        <Text style={styles.subtitle}>Create a farm and your first grow cycle.</Text>

        <Text style={styles.label}>Farm name</Text>
        <TextInput
          style={styles.input}
          value={farmName}
          onChangeText={setFarmName}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        <Text style={styles.label}>Cycle name</Text>
        <TextInput
          style={styles.input}
          value={cycleName}
          onChangeText={setCycleName}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        <Text style={styles.label}>Cultivar (optional)</Text>
        <TextInput
          style={styles.input}
          value={cultivar}
          onChangeText={setCultivar}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        <Text style={styles.label}>Stage</Text>
        <TextInput
          style={styles.input}
          value={stage}
          onChangeText={setStage}
          autoCapitalize="none"
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, pending && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={pending}
        >
          <Text style={styles.buttonText}>{pending ? 'Creating…' : 'Start journaling'}</Text>
        </Pressable>

        <Pressable style={styles.skip} onPress={handleSkip}>
          <Text style={styles.skipText}>Continue on this device only</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.screen },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.screen },
    container: { padding: 24, paddingTop: 48 },
    title: { fontSize: 24, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 15, color: c.textMuted, marginBottom: 24, marginTop: 8 },
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
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    error: { color: c.dangerText, marginBottom: 8 },
    skip: { marginTop: 20, alignItems: 'center' },
    skipText: { color: c.textMuted, fontSize: 15, textDecorationLine: 'underline' },
  });
}
