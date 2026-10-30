import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { extractVoiceIntent } from '@growlog/api-client';
import { createLogEntry, type EventType } from '@growlog/domain';
import { transcribeRecordingFile } from '@/lib/transcribe-recording';
import type { AudioRecorder } from 'expo-audio';
import { discardVoiceRecording, startVoiceRecording, stopVoiceRecording } from '@/lib/voice-recording';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useMobileLocale } from '@/context/LocaleContext';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Step = 'idle' | 'recording' | 'processing' | 'review';

const MAX_MS = 120_000;

export default function VoiceCaptureScreen() {
  const { supabase, farmId, cycle, primaryScope, userId, refetchAll } = useFarmContext();
  const { locale, strings } = useMobileLocale();
  const voiceCopy = strings.cycle;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [eventType, setEventType] = useState<EventType>('note');
  const [body, setBody] = useState('');
  const [savePending, setSavePending] = useState(false);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) void discardVoiceRecording(rec);
    };
  }, []);

  const runPipeline = useCallback(
    async (uri: string, durationMs?: number) => {
      setStep('processing');
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Not signed in');

        const text = await transcribeRecordingFile({
          uri,
          token,
          language: locale,
          durationMs,
        });
        setTranscript(text);

        const ex = await extractVoiceIntent(token, text);
        const type = (ex.event_type as EventType | undefined) ?? 'note';
        setEventType(type);
        setBody(ex.body?.trim() || text);
        setStep('review');
      } catch (err: unknown) {
        setError(err instanceof Error ? mapVoiceApiError(err.message, voiceCopy) : mapVoiceApiError('Voice failed', voiceCopy));
        setStep('idle');
      }
    },
    [locale, supabase, voiceCopy]
  );

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    const elapsedBefore = rec.getStatus().durationMillis;
    try {
      const uri = await stopVoiceRecording(rec);
      const elapsedAfter = rec.getStatus().durationMillis;
      await runPipeline(uri, Math.max(elapsedBefore || 0, elapsedAfter || 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? mapVoiceApiError(err.message, voiceCopy) : mapVoiceApiError('No recording file', voiceCopy));
      setStep('idle');
    }
  }, [runPipeline]);

  async function startRecording() {
    setError(null);
    try {
      recordingRef.current = await startVoiceRecording();
    } catch (err: unknown) {
      setError(err instanceof Error ? mapVoiceApiError(err.message, voiceCopy) : mapVoiceApiError('Microphone permission required', voiceCopy));
      return;
    }
    setStep('recording');
    timerRef.current = setTimeout(() => {
      void stopRecording();
    }, MAX_MS);
  }

  async function save() {
    if (!farmId || !cycle || !primaryScope || !body.trim()) return;
    setSavePending(true);
    setError(null);
    try {
      await createLogEntry(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        eventType,
        body: body.trim(),
        occurredAt: new Date().toISOString(),
        sourceType: 'user_voice',
        createdBy: userId,
        payload: transcript ? { voice: { transcript } } : undefined,
      });
      await refetchAll();
      router.back();
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavePending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Complete onboarding first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {step === 'idle' && (
        <Pressable style={styles.recordBtn} onPress={() => void startRecording()}>
          <Text style={styles.recordBtnText}>Start recording</Text>
        </Pressable>
      )}

      {step === 'recording' && (
        <>
          <Text style={styles.recordingLabel}>Recording…</Text>
          <Pressable style={styles.stopBtn} onPress={() => void stopRecording()}>
            <Text style={[styles.recordBtnText, styles.stopBtnText]}>Stop</Text>
          </Pressable>
        </>
      )}

      {step === 'processing' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Transcribing…</Text>
        </View>
      )}

      {step === 'review' && (
        <>
          <Text style={styles.label}>Transcript</Text>
          <Text style={styles.transcript}>{transcript}</Text>
          <Text style={styles.label}>Event type: {eventType}</Text>
          <TextInput
            style={styles.input}
            multiline
            value={body}
            onChangeText={setBody}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
          <Pressable
            style={[styles.recordBtn, savePending && styles.disabled]}
            onPress={() => void save()}
            disabled={savePending}
          >
            <Text style={styles.recordBtnText}>{savePending ? 'Saving…' : 'Confirm & save'}</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!process.env.EXPO_PUBLIC_API_BASE_URL && step === 'idle' && (
        <Text style={styles.hint}>
          Set EXPO_PUBLIC_API_BASE_URL to your Next.js dev server (e.g. http://localhost:3000) for
          voice transcribe/extract.
        </Text>
      )}
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screen },
    container: { padding: 16, flexGrow: 1 },
    center: { alignItems: 'center', padding: 24, backgroundColor: c.screen },
    centerText: { color: c.text },
    recordBtn: {
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 24,
    },
    stopBtn: {
      backgroundColor: '#b91c1c',
      borderRadius: 999,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 16,
    },
    recordBtnText: { color: c.primaryText, fontSize: 17, fontWeight: '600' },
    stopBtnText: { color: '#ffffff' },
    recordingLabel: { textAlign: 'center', fontSize: 16, color: c.dangerText, marginTop: 24 },
    muted: { marginTop: 12, color: c.textMuted },
    label: { fontWeight: '600', marginTop: 16, marginBottom: 6, color: c.text },
    transcript: {
      backgroundColor: c.surfaceMuted,
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      color: c.text,
    },
    input: {
      minHeight: 100,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      textAlignVertical: 'top',
    },
    error: { color: c.dangerText, marginTop: 16 },
    hint: { fontSize: 12, color: c.textMuted, marginTop: 24, lineHeight: 18 },
    disabled: { opacity: 0.6 },
  });
}
