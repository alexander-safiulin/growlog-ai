import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { enqueueLogEntry } from '@/lib/offline-queue';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  appendLocalJournalEntry,
  createLogEntry,
  formatGrowerPrefillDate,
  occurredAtForFarmCalendarDay,
} from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const PROCEDURE_PAYLOAD = { procedure: true } as const;

export function CycleProcedureForm({
  onSubmitted,
  prefillDate,
}: {
  onSubmitted?: () => void;
  prefillDate?: string;
}) {
  const { strings, locale } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const capture = strings.captureScreen;
  const {
    supabase,
    farmId,
    cycle,
    scopeId,
    refetchAll,
    farms,
    isLocalWorkspace,
    updateLocalWorkspace,
    displayFarmTimezone,
    userId,
  } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? displayFarmTimezone;
  const [body, setBody] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cycle || !farmId || !scopeId) {
    return <Text style={styles.muted}>{copy.noActive}</Text>;
  }

  async function submit() {
    if (!cycle || !farmId || !scopeId) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setFieldError(copy.procedureRequired);
      return;
    }
    setFieldError(null);
    setError(null);
    setPending(true);
    const occurredAt = prefillDate
      ? occurredAtForFarmCalendarDay(prefillDate, farmTz)
      : new Date().toISOString();

    try {
      if (isLocalWorkspace) {
        await updateLocalWorkspace((store) =>
          appendLocalJournalEntry(store, {
            event_type: 'action_taken',
            occurred_at: occurredAt,
            body: trimmed,
            source_type: 'user_form',
            payload: { ...PROCEDURE_PAYLOAD },
          }),
        );
        refetchAll();
        onSubmitted?.();
        return;
      }

      const payload = {
        farmId,
        cycleId: cycle.id,
        scopeId,
        eventType: 'action_taken' as const,
        body: trimmed,
        occurredAt,
        sourceType: 'user_form' as const,
        createdBy: userId,
        payload: { ...PROCEDURE_PAYLOAD },
      };

      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      if (offline) {
        await enqueueLogEntry(payload);
        refetchAll();
        onSubmitted?.();
        return;
      }

      await createLogEntry(supabase, payload);
      refetchAll();
      onSubmitted?.();
    } catch (e: unknown) {
      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      if (!isLocalWorkspace && offline) {
        await enqueueLogEntry({
          farmId,
          cycleId: cycle.id,
          scopeId,
          eventType: 'action_taken',
          body: trimmed,
          occurredAt,
          sourceType: 'user_form',
          createdBy: userId,
          payload: { ...PROCEDURE_PAYLOAD },
        });
        refetchAll();
        onSubmitted?.();
        return;
      }
      setError(e instanceof Error ? e.message : capture.saveFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {prefillDate ? (
          <Text style={styles.hint}>
            {copy.logPrefillDate.replace('{date}', formatGrowerPrefillDate(prefillDate, locale))}
          </Text>
        ) : null}
        <Text style={styles.label}>{capture.whatHappened}</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={6}
          value={body}
          onChangeText={setBody}
          placeholder={copy.procedurePlaceholder}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
          textAlignVertical="top"
        />
        {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={copy.logSubmit} onPress={submit} disabled={pending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 8, backgroundColor: c.screen },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    hint: { fontSize: 13, color: c.sectionLabel },
    input: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    muted: { padding: 16, color: c.textMuted },
    error: { color: c.dangerText, fontSize: 13 },
  });
}
