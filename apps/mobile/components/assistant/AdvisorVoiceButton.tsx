import { routeAdvisorTranscript } from '@growlog/web-lib/assistant/voice-intent-router';
import { speakText } from '@/lib/speak-text';
import { uriToBase64 } from '@/lib/uri-to-base64';
import type { ChatExtractionResult } from '@growlog/web-lib/chat/extraction-schema';
import { useFarmContext } from '@/providers/FarmProvider';
import { askAssistant, postJson, transcribeVoice } from '@growlog/api-client';
import { useMobileLocale } from '@/context/LocaleContext';
import type { AskResponse } from '@/lib/advisor-types';
import type { AudioRecorder } from 'expo-audio';
import { startVoiceRecording, stopVoiceRecording } from '@/lib/voice-recording';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const { locale } = useMobileLocale();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [logDraft, setLogDraft] = useState<ChatExtractionResult | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [logPending, setLogPending] = useState(false);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<string | null>(null);

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
    if (!rec) return;
    recordingRef.current = null;
    setRecording(false);
    let uri: string;
    try {
      uri = await stopVoiceRecording(rec);
    } catch {
      onError('No recording');
      return;
    }
    setProcessing(true);
    try {
      const base64 = await uriToBase64(uri);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      const tr = await transcribeVoice(token, { audioBase64: base64, mimeType: 'audio/m4a' });
      const text = tr.text?.trim() ?? '';
      if (!text) throw new Error('Empty transcript');
      await runTranscript(text);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Voice failed');
    } finally {
      setProcessing(false);
    }
  }, [onError, runTranscript, supabase]);

  async function startRecording() {
    if (disabled || processing) return;
    setLogDraft(null);
    setLogMessage(null);
    let rec: AudioRecorder;
    try {
      rec = await startVoiceRecording();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Microphone permission required');
      return;
    }
    recordingRef.current = rec;
    setRecording(true);
    timerRef.current = setTimeout(() => void stopRecording(), MAX_MS);
  }

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

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.micBtn, (disabled || processing) && styles.disabled, recording && styles.recording]}
        onPress={() => (recording ? void stopRecording() : void startRecording())}
        disabled={disabled || processing}
      >
        {processing ? (
          <ActivityIndicator color="#2d6a4f" size="small" />
        ) : (
          <Text style={styles.micText}>{recording ? 'Stop' : 'Mic'}</Text>
        )}
      </Pressable>
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

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  micBtn: {
    borderWidth: 1,
    borderColor: '#2d6a4f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 56,
    alignItems: 'center',
  },
  recording: { backgroundColor: '#fee2e2', borderColor: '#b91c1c' },
  disabled: { opacity: 0.5 },
  micText: { color: '#2d6a4f', fontWeight: '600' },
  hint: { fontSize: 12, color: '#6b7280' },
  confirmBox: { padding: 8, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  confirmRow: { flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#2d6a4f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  confirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancel: { color: '#6b7280', fontSize: 13 },
});
