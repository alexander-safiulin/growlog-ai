import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { EventType } from '@growlog/domain';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { enqueueLogEntry } from '@/lib/offline-queue';
import { createLogEntry } from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const QUICK_TYPES = [
  'note',
  'observation',
  'action_taken',
  'watering',
  'feeding',
  'issue_detected',
] as const satisfies readonly EventType[];

export default function TextCaptureScreen() {
  const { strings } = useMobileLocale();
  const c = strings.captureScreen;
  const { supabase, farmId, cycle, primaryScope, userId, refetchAll } = useFarmContext();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [eventType, setEventType] = useState<EventType>('note');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!farmId || !cycle || !primaryScope || !body.trim()) return;
    setError(null);
    setMsg(null);
    setPending(true);
    const payload = {
      farmId,
      cycleId: cycle.id,
      scopeId: primaryScope.id,
      eventType,
      body: body.trim(),
      occurredAt: new Date().toISOString(),
      sourceType: 'user_form' as const,
      createdBy: userId,
    };
    try {
      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      if (offline) {
        await enqueueLogEntry(payload);
        setMsg(c.savedOffline);
        setBody('');
        setTimeout(() => {
          router.back();
          router.back();
        }, 800);
        return;
      }
      await createLogEntry(supabase, payload);
      await refetchAll();
      router.back();
      router.back();
    } catch (err: unknown) {
      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      if (offline) {
        await enqueueLogEntry(payload);
        setMsg(c.savedOffline);
        setBody('');
        setTimeout(() => {
          router.back();
          router.back();
        }, 800);
        return;
      }
      setError(err instanceof Error ? err.message : c.saveFailed);
    } finally {
      setPending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>{c.needOnboarding}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.label}>{c.eventType}</Text>
        <View style={styles.chips}>
          {QUICK_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, eventType === t && styles.chipActive]}
              onPress={() => setEventType(t)}
            >
              <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>
                {c.eventTypes[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{c.whatHappened}</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={5}
          value={body}
          onChangeText={setBody}
          placeholder={c.bodyPlaceholder}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {msg ? <Text style={styles.ok}>{msg}</Text> : null}

        <Pressable
          style={[styles.button, pending && styles.buttonDisabled]}
          onPress={submit}
          disabled={pending}
        >
          <Text style={styles.buttonText}>
            {pending ? strings.commonMobile.saving : c.saveJournal}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.screen },
    centerText: { color: c.text },
    screen: { flex: 1, backgroundColor: c.screen },
    container: { padding: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: c.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surfaceMuted,
    },
    chipActive: { backgroundColor: c.primary },
    chipText: { fontSize: 12, color: c.text },
    chipTextActive: { color: c.primaryText },
    input: {
      minHeight: 120,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: c.text,
      textAlignVertical: 'top',
    },
    button: {
      marginTop: 20,
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    error: { color: c.dangerText, marginTop: 8 },
    ok: { color: c.okText, marginTop: 8 },
  });
}
