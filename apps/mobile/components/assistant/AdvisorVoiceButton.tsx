import { routeAdvisorTranscript } from '@growlog/web-lib/assistant/voice-intent-router';
import { speakText } from '@/lib/speak-text';
import type { ChatExtractionResult } from '@growlog/web-lib/chat/extraction-schema';
import { useFarmContext } from '@/providers/FarmProvider';
import { askAssistant, postJson } from '@growlog/api-client';
import { useMobileLocale } from '@/context/LocaleContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import type { AskResponse } from '@/lib/advisor-types';
import type { PhotoPickResult } from '@/lib/photo-upload';
import { uploadPhotoCapture } from '@/lib/photo-upload';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ADVISOR_CONVERSATION_KEY = 'growlog_advisor_conversation_id';

type Props = {
  disabled?: boolean;
  pendingPhoto: PhotoPickResult | null;
  onConsumedPhoto: () => void;
  onUserTurn: (text: string, photoUri?: string | null) => void;
  onAskResult: (response: AskResponse) => void;
  onError: (message: string) => void;
  conversationIdRef: MutableRefObject<string | null>;
};

export function AdvisorVoiceButton({
  disabled,
  pendingPhoto,
  onConsumedPhoto,
  onUserTurn,
  onAskResult,
  onError,
  conversationIdRef,
}: Props) {
  const { supabase, farmId, cycle, primaryScope, userId, isLocalWorkspace } = useFarmContext();
  const { locale, strings } = useMobileLocale();
  const voiceCopy = strings.cycle;
  const advisorCopy = strings.advisorScreen;
  const styles = useThemedStyles(makeStyles);
  const [logDraft, setLogDraft] = useState<ChatExtractionResult | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [logPending, setLogPending] = useState(false);
  const processingRef = useRef(false);
  const pendingPhotoRef = useRef(pendingPhoto);
  pendingPhotoRef.current = pendingPhoto;
  const { register, setPhase } = useVoiceCapture();
  const cloudEnabled = !isLocalWorkspace && !!userId;

  const resolveMediaAssetId = useCallback(
    async (token: string): Promise<string | undefined> => {
      const pick = pendingPhotoRef.current;
      if (!pick || !farmId || !cycle?.id || !primaryScope?.id) return undefined;
      const outcome = await uploadPhotoCapture(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        pick,
        userId,
      });
      if (outcome.status !== 'uploaded') {
        throw new Error(advisorCopy.photoNeedsOnline);
      }
      onConsumedPhoto();
      return outcome.mediaAssetId;
    },
    [advisorCopy.photoNeedsOnline, cycle?.id, farmId, onConsumedPhoto, primaryScope?.id, supabase, userId]
  );

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
      const trimmed = text.trim();
      const photoUri = pendingPhotoRef.current?.uri ?? null;
      const displayText =
        trimmed ||
        (photoUri ? advisorCopy.photoOnlyQuestion : '');
      if (!displayText && !photoUri) return;

      onUserTurn(displayText || advisorCopy.photoOnlyQuestion, photoUri);
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

      let mediaAssetId: string | undefined;
      if (photoUri && cloudEnabled) {
        try {
          mediaAssetId = await resolveMediaAssetId(token);
        } catch (e: unknown) {
          onError(e instanceof Error ? e.message : 'Upload failed');
          return;
        }
      }

      const messageForRoute = trimmed || advisorCopy.photoOnlyQuestion;
      const route = routeAdvisorTranscript(messageForRoute);
      if (route === 'log_extract' && !mediaAssetId) {
        setLogMessage(messageForRoute);
        setLogPending(true);
        try {
          await runLogExtract(token, messageForRoute);
        } catch (e: unknown) {
          onError(e instanceof Error ? e.message : 'Extract failed');
        } finally {
          setLogPending(false);
        }
        return;
      }

      let conversationId = conversationIdRef.current;
      if (!conversationId) {
        conversationId = await SecureStore.getItemAsync(ADVISOR_CONVERSATION_KEY);
        if (!conversationId) {
          conversationId = crypto.randomUUID();
          await SecureStore.setItemAsync(ADVISOR_CONVERSATION_KEY, conversationId);
        }
        conversationIdRef.current = conversationId;
      }

      const data = (await askAssistant(token, {
        message: messageForRoute,
        farmId,
        cycleId: cycle?.id ?? null,
        scopeId: primaryScope?.id ?? null,
        conversationId,
        locale,
        ...(mediaAssetId ? { mediaAssetId } : {}),
      })) as AskResponse;

      onAskResult(data);
      void speakText(token, data.body);
    },
    [
      advisorCopy.photoOnlyQuestion,
      cloudEnabled,
      conversationIdRef,
      cycle?.id,
      farmId,
      locale,
      onAskResult,
      onError,
      onUserTurn,
      primaryScope?.id,
      resolveMediaAssetId,
      runLogExtract,
      supabase,
    ]
  );

  const onVoiceError = useCallback(
    (message: string) => {
      onError(mapVoiceApiError(message, voiceCopy));
    },
    [onError, voiceCopy]
  );

  const {
    recording,
    processing,
    recordingElapsedSec,
    recordingLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceTranscription({
    supabase,
    enabled: cloudEnabled && !disabled,
    language: locale,
    onTranscript: runTranscript,
    onError: onVoiceError,
  });

  processingRef.current = processing;

  const apiRef = useRef({
    start: () => undefined as void,
    stop: () => undefined as void,
    cancel: () => undefined as void,
    submitText: async (_text: string) => undefined as void,
  });

  apiRef.current.start = () => {
    void startRecording();
  };
  apiRef.current.stop = () => {
    void stopRecording();
  };
  apiRef.current.cancel = () => {
    void cancelRecording();
  };
  apiRef.current.submitText = async (text: string) => {
    if (processingRef.current || recording) {
      throw new Error('Stop the mic before sending text.');
    }
    try {
      await runTranscript(text);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Send failed');
      throw e;
    }
  };

  useEffect(() => {
    return register({
      start: () => apiRef.current.start(),
      stop: () => apiRef.current.stop(),
      cancel: () => apiRef.current.cancel(),
      submitText: (text) => apiRef.current.submitText(text),
    });
  }, [register, recording]);

  useEffect(() => {
    setPhase({ recording, processing, recordingLevel, recordingElapsedSec });
  }, [processing, recording, recordingLevel, recordingElapsedSec, setPhase]);

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
      {logPending && !logDraft ? <Text style={styles.hint}>{advisorCopy.extractingLog}</Text> : null}
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
