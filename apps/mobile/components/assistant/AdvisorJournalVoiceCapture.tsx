import type { ChatExtractionResult } from '@growlog/web-lib/chat/extraction-schema';
import { useMobileLocale } from '@/context/LocaleContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useFarmContext } from '@/providers/FarmProvider';
import { postJson } from '@growlog/api-client';
import { createLogEntry } from '@growlog/domain';
import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  active: boolean;
  onError: (message: string) => void;
  onSaved: () => void;
  onIdle: () => void;
};

/** Orbit +: voice capture that always persists structured journal events (timeline), not advisor chat. */
export function AdvisorJournalVoiceCapture({ active, onError, onSaved, onIdle }: Props) {
  const { supabase, farmId, cycle, primaryScope, refetchAll, userId, isLocalWorkspace } =
    useFarmContext();
  const { locale, strings } = useMobileLocale();
  const advisorCopy = strings.advisorScreen;
  const voiceCopy = strings.cycle;
  const { register, setPhase } = useVoiceCapture();
  const [saving, setSaving] = useState(false);
  const autoStartRef = useRef(false);
  const cloudEnabled = !isLocalWorkspace && !!userId;

  const finishSession = useCallback(() => {
    onIdle();
  }, [onIdle]);

  const persistJournal = useCallback(
    async (text: string) => {
      if (!farmId || !cycle?.id || !primaryScope?.id) {
        onError(advisorCopy.photoNeedCycle);
        finishSession();
        return;
      }
      const trimmed = text.trim();
      if (!trimmed) {
        finishSession();
        return;
      }

      setSaving(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Not signed in');

        const draft = await postJson<ChatExtractionResult>(
          '/api/assistant/extract',
          { message: trimmed, origin: 'chat_extract' },
          token
        );

        if (draft.events.length === 0 && draft.readings.length === 0) {
          await createLogEntry(supabase, {
            farmId,
            cycleId: cycle.id,
            scopeId: primaryScope.id,
            eventType: 'note',
            body: trimmed,
            occurredAt: new Date().toISOString(),
            sourceType: 'user_voice',
            createdBy: userId ?? undefined,
            payload: { voice: { transcript: trimmed } },
          });
        } else {
          await postJson(
            '/api/assistant/confirm-log',
            {
              farmId,
              cycleId: cycle.id,
              scopeId: primaryScope.id,
              events: draft.events,
              readings: draft.readings,
              user_text: trimmed,
              origin: 'chat_extract',
            },
            token
          );
        }

        await refetchAll();
        onSaved();
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
        finishSession();
      }
    },
    [
      advisorCopy.photoNeedCycle,
      cycle?.id,
      farmId,
      finishSession,
      onError,
      onSaved,
      primaryScope?.id,
      refetchAll,
      supabase,
      userId,
    ]
  );

  const onVoiceError = useCallback(
    (message: string) => {
      onError(mapVoiceApiError(message, voiceCopy));
      finishSession();
    },
    [finishSession, onError, voiceCopy]
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
    enabled: active && cloudEnabled,
    language: locale,
    onTranscript: (text) => void persistJournal(text),
    onError: onVoiceError,
  });

  const busy = processing || saving;

  const apiRef = useRef({
    start: () => undefined as void,
    stop: () => undefined as void,
    cancel: () => undefined as void,
    submitText: async (_text: string) => undefined as void,
  });

  apiRef.current.start = () => {
    if (busy || recording) return;
    void startRecording();
  };
  apiRef.current.stop = () => {
    void stopRecording();
  };
  apiRef.current.cancel = () => {
    void cancelRecording();
    if (!busy) finishSession();
  };
  apiRef.current.submitText = async () => {
    throw new Error('Text send is not available for orbit journal capture.');
  };

  useEffect(() => {
    if (active) autoStartRef.current = true;
    else autoStartRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!active || !autoStartRef.current || recording || busy) return;
    autoStartRef.current = false;
    void startRecording();
  }, [active, busy, recording, startRecording]);

  useEffect(() => {
    if (!active) return undefined;
    return register({
      start: () => apiRef.current.start(),
      stop: () => apiRef.current.stop(),
      cancel: () => apiRef.current.cancel(),
      submitText: (text) => apiRef.current.submitText(text),
    });
  }, [active, register]);

  useEffect(() => {
    if (!active) return;
    setPhase({
      recording,
      processing: busy,
      recordingLevel,
      recordingElapsedSec,
      processingLabel: busy ? advisorCopy.extractingLog : null,
    });
  }, [
    active,
    advisorCopy.extractingLog,
    busy,
    processing,
    recording,
    recordingElapsedSec,
    recordingLevel,
    setPhase,
  ]);

  return null;
}
