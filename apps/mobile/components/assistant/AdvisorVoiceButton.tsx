import { routeAdvisorTranscript } from '@growlog/web-lib/assistant/voice-intent-router';
import { speakText } from '@/lib/speak-text';
import { transcribeRecordingFile } from '@/lib/transcribe-recording';
import type { ChatExtractionResult } from '@growlog/web-lib/chat/extraction-schema';
import { useFarmContext } from '@/providers/FarmProvider';
import { askAssistant, postJson } from '@growlog/api-client';
import { useMobileLocale } from '@/context/LocaleContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import type { AskResponse } from '@/lib/advisor-types';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { AudioRecorder } from 'expo-audio';
import { discardVoiceRecording, startVoiceRecording, stopVoiceRecording } from '@/lib/voice-recording';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const MAX_MS = 120_000;
const ADVISOR_CONVERSATION_KEY = 'growlog_advisor_conversation_id';

type Props = {
  disabled?: boolean;
  onUserTurn: (text: string) => void;
  onAskResult: (response: AskResponse) => void;
  onError: (message: string) => void;
};

export function AdvisorVoiceButton({ disabled, onUserTurn, onAskResult, onError }: Props) {
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const { locale, strings } = useMobileLocale();
  const voiceCopy = strings.cycle;
  const styles = useThemedStyles(makeStyles);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [logDraft, setLogDraft] = useState<ChatExtractionResult | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [logPending, setLogPending] = useState(false);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const startingRef = useRef(false);
  const processingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<string | null>(null);
  const { register, setPhase } = useVoiceCapture();
  const apiRef = useRef({
    start: () => undefined as void,
    stop: () => undefined as void,
    submitText: async (_text: string) => undefined as void,
  });
  processingRef.current = processing;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void recordingRef.current?.stop();
    };
  }, []);

  const runLogExtract = useCallback(
    async (token: string, message: string) => {
      const data = await postJson<ChatExtractionResult>(
        '/api/assistant/extract',
        { message, origin: 'chat_extract' },
        token
      );
      setLogDraft(data);
    },
    []
  );

  const runTranscript = useCallback(
    async (text: string) => {
      if (!farmId) return;
      onUserTurn(text);
      setLogDraft(null);
      setLogMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        onError('Not signed in');
        return;
      }

      const route = routeAdvisorTranscript(text);
      if (route === 'log_extract') {
        setLogMessage(text);
        setLogPending(true);
        try {
          await runLogExtract(token, text);
        } catch (e: unknown) {
          onError(e instanceof Error ? e.message : 'Extract failed');
        } finally {
          setLogPending(false);
        }
        return;
      }

      let conversationId = conversationRef.current;
      if (!conversationId) {
        conversationId = await SecureStore.getItemAsync(ADVISOR_CONVERSATION_KEY);
        if (!conversationId) {
          conversationId = crypto.randomUUID();
          await SecureStore.setItemAsync(ADVISOR_CONVERSATION_KEY, conversationId);
        }
      }

      const data = (await askAssistant(token, {
        message: text,
        farmId,
        cycleId: cycle?.id ?? null,
        scopeId: primaryScope?.id ?? null,
        conversationId,
        locale,
      })) as AskResponse;

      onAskResult(data);
      void speakText(token, data.body);
    },
    [cycle?.id, farmId, locale, onAskResult, onError, onUserTurn, primaryScope?.id, runLogExtract, supabase]
  );

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    startingRef.current = false;
    setRecording(false);
    if (!rec) return;
    const elapsedBefore = rec.getStatus().durationMillis;
    let uri: string;
    try {
      uri = await stopVoiceRecording(rec);
    } catch {
      onError(mapVoiceApiError('No recording file', voiceCopy));
      return;
    }
    setProcessing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      const elapsedAfter = rec.getStatus().durationMillis;
      const text = await transcribeRecordingFile({
        uri,
        token,
        language: locale,
        durationMs: Math.max(elapsedBefore || 0, elapsedAfter || 0),
      });
      await runTranscript(text);
    } catch (e: unknown) {
      onError(e instanceof Error ? mapVoiceApiError(e.message, voiceCopy) : mapVoiceApiError('Voice failed', voiceCopy));
    } finally {
      setProcessing(false);
    }
  }, [locale, onError, runTranscript, supabase, voiceCopy]);

  async function startRecording() {
    if (disabled || processingRef.current || recordingRef.current || startingRef.current) return;
    startingRef.current = true;
    setLogDraft(null);
    setLogMessage(null);
    let rec: AudioRecorder;
    try {
      rec = await startVoiceRecording();
    } catch (e: unknown) {
      startingRef.current = false;
      onError(e instanceof Error ? mapVoiceApiError(e.message, voiceCopy) : mapVoiceApiError('Microphone permission required', voiceCopy));
      return;
    }
    if (!startingRef.current) {
      void discardVoiceRecording(rec);
      return;
    }
    recordingRef.current = rec;
    setRecording(true);
    timerRef.current = setTimeout(() => void stopRecording(), MAX_MS);
  }

  apiRef.current.start = () => {
    void startRecording();
  };
  apiRef.current.stop = () => {
    void stopRecording();
  };
  apiRef.current.submitText = async (text: string) => {
    if (processingRef.current || recordingRef.current || startingRef.current) {
      throw new Error('Stop the mic before sending text.');
    }
    setProcessing(true);
    try {
      await runTranscript(text);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Send failed');
      throw e;
    } finally {
      setProcessing(false);
    }
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

  async function confirmLog() {
    if (!logDraft || !farmId || !cycle?.id || !primaryScope?.id || !logMessage) return;
    setLogPending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      await postJson('/api/assistant/confirm-log', {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        events: logDraft.events,
        readings: logDraft.readings,
        user_text: logMessage,
        origin: 'chat_extract',
      }, token);
      setLogDraft(null);
      setLogMessage(null);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLogPending(false);
    }
  }

  if (!logDraft && !logPending) return null;

  return (
    <View style={styles.wrap}>
      {logPending && !logDraft ? <Text style={styles.hint}>Extracting journal draft…</Text> : null}
      {logDraft ? (
        <View style={styles.confirmBox}>
          <Text style={styles.hint}>
            {logDraft.events.length} event(s), {logDraft.readings.length} reading(s) — confirm save
          </Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.confirmBtn} onPress={() => void confirmLog()} disabled={logPending}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </Pressable>
            <Pressable onPress={() => setLogDraft(null)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6, paddingHorizontal: 12 },
    hint: { fontSize: 12, color: c.textMuted },
    confirmBox: { padding: 8, backgroundColor: c.surfaceMuted, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    confirmRow: { flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' },
    confirmBtn: { backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    confirmBtnText: { color: c.primaryText, fontWeight: '600', fontSize: 13 },
    cancel: { color: c.textMuted, fontSize: 13 },
  });
}
