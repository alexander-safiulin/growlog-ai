import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { enqueueLogEntry } from '@/lib/offline-queue';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  appendLocalJournalEntry,
  createLogEntry,
  formatGrowerPrefillDate,
  occurredAtForFarmCalendarDay,
} from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const PROCEDURE_PAYLOAD = { procedure: true } as const;

function mergeDictationText(prev: string, next: string) {
  const t = next.trim();
  if (!t) return prev;
  const p = prev.trim();
  if (!p) return t;
  return `${p}\n\n${t}`;
}

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
  const voiceUsedRef = useRef(false);
  const voiceEnabled = !isLocalWorkspace && !!userId;
  const { register, setPhase } = useVoiceCapture();

  const applyTranscript = useCallback((text: string) => {
    voiceUsedRef.current = true;
    setBody((prev) => mergeDictationText(prev, text));
    setFieldError(null);
    setError(null);
  }, []);

  const onVoiceError = useCallback(
    (message: string) => {
      if (message === 'Not signed in') {
        setError(copy.procedureVoiceNeedSignIn);
        return;
      }
      setError(message);
    },
    [copy.procedureVoiceNeedSignIn],
  );

  const { recording, processing, startRecording, stopRecording, toggleRecording } = useVoiceTranscription({
    supabase,
    enabled: voiceEnabled,
    onTranscript: applyTranscript,
    onError: onVoiceError,
  });

  const apiRef = useRef({
    start: () => undefined as void,
    stop: () => undefined as void,
    submitText: async (_text: string) => undefined as void,
  });

  apiRef.current.start = () => {
    void startRecording();
  };
  apiRef.current.stop = () => {
    void stopRecording();
  };
  apiRef.current.submitText = async (text: string) => {
    applyTranscript(text);
  };

  useEffect(() => {
    return register({
      start: () => apiRef.current.start(),
      stop: () => apiRef.current.stop(),
      submitText: (text) => apiRef.current.submitText(text),
    });
  }, [register]);

  useEffect(() => {
    setPhase({ recording, processing });
  }, [processing, recording, setPhase]);

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
    const sourceType = voiceUsedRef.current ? ('user_voice' as const) : ('user_form' as const);
    const eventPayload = voiceUsedRef.current
      ? { ...PROCEDURE_PAYLOAD, voice: { dictated: true } }
      : { ...PROCEDURE_PAYLOAD };

    try {
      if (isLocalWorkspace) {
        await updateLocalWorkspace((store) =>
          appendLocalJournalEntry(store, {
            event_type: 'action_taken',
            occurred_at: occurredAt,
            body: trimmed,
            source_type: sourceType,
            payload: eventPayload,
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
        sourceType,
        createdBy: userId,
        payload: eventPayload,
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
          sourceType,
          createdBy: userId,
          payload: eventPayload,
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

  const voiceBusy = recording || processing;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {prefillDate ? (
          <Text style={styles.hint}>
            {copy.logPrefillDate.replace('{date}', formatGrowerPrefillDate(prefillDate, locale))}
          </Text>
        ) : null}
        <View style={styles.labelRow}>
          <Text style={styles.label}>{capture.whatHappened}</Text>
          <Pressable
            style={[
              styles.micBtn,
              recording && styles.micBtnRecording,
              (!voiceEnabled || voiceBusy) && !recording && styles.micBtnDisabled,
            ]}
            onPress={() => {
              if (!voiceEnabled) {
                setError(copy.procedureVoiceNeedSignIn);
                return;
              }
              toggleRecording();
            }}
            disabled={processing || pending}
            accessibilityRole="button"
            accessibilityLabel={copy.procedureVoiceA11y}
          >
            {processing ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <SymbolView
                name={{
                  ios: recording ? 'stop.fill' : 'mic.fill',
                  android: recording ? 'stop' : 'mic',
                  web: recording ? 'stop' : 'mic',
                }}
                tintColor={recording ? '#fff' : colors.primary}
                size={22}
              />
            )}
          </Pressable>
        </View>
        {voiceEnabled ? (
          <Text style={styles.voiceHint}>{copy.procedureVoiceHint}</Text>
        ) : (
          <Text style={styles.voiceHintMuted}>{copy.procedureVoiceNeedSignIn}</Text>
        )}
        {recording ? <Text style={styles.recordingLabel}>{copy.procedureRecording}</Text> : null}
        {processing ? <Text style={styles.recordingLabel}>{copy.procedureTranscribing}</Text> : null}
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
          editable={!pending}
        />
        {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={copy.logSubmit} onPress={submit} disabled={pending || voiceBusy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 8, backgroundColor: c.screen },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: c.text, flex: 1 },
    micBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micBtnRecording: {
      backgroundColor: '#9a3412',
      borderColor: '#9a3412',
    },
    micBtnDisabled: { opacity: 0.45 },
    voiceHint: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
    voiceHintMuted: { fontSize: 12, color: c.textMuted, lineHeight: 17, fontStyle: 'italic' },
    recordingLabel: { fontSize: 13, fontWeight: '600', color: c.primary },
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
