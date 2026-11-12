import type { JournalVoiceSaveResult } from '@/components/assistant/journal-voice-save';
import { useMobileLocale } from '@/context/LocaleContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useFarmContext } from '@/providers/FarmProvider';
import { createLogEntry } from '@growlog/domain';
import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  active: boolean;
  onError: (message: string) => void;
  onSaved: (result: JournalVoiceSaveResult) => void;
  onIdle: () => void;
};

/** Orbit +: transcribe full voice to text and append one journal event at stop time (timeline). */
export function AdvisorJournalVoiceCapture({ active, onError, onSaved, onIdle }: Props) {
  const { supabase, farmId, cycle, primaryScope, refetchAll, userId, isLocalWorkspace } =
    useFarmContext();
  const { locale, strings } = useMobileLocale();
  const advisorCopy = strings.advisorScreen;
  const voiceCopy = strings.cycle;
  const { register, setPhase } = useVoiceCapture();
  const [saving, setSaving] = useState(false);
  const autoStartRef = useRef(false);
  const occurredAtRef = useRef<string | null>(null);
  const recordingDurationRef = useRef<number | undefined>(undefined);
  const recordingElapsedSecRef = useRef(0);
  const cloudEnabled = !isLocalWorkspace && !!userId;

  const finishSession = useCallback(() => {
    occurredAtRef.current = null;
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

      const occurredAt = occurredAtRef.current ?? new Date().toISOString();
      occurredAtRef.current = null;

      setSaving(true);
      try {
        const write = await createLogEntry(supabase, {
          farmId,
          cycleId: cycle.id,
          scopeId: primaryScope.id,
          eventType: 'note',
          body: trimmed,
          occurredAt,
          sourceType: 'user_voice',
          createdBy: userId ?? undefined,
          payload: { voice: { transcript: trimmed } },
        });

        await refetchAll();
        const ev = write.event as Record<string, unknown>;
        onSaved({
          body: trimmed,
          occurredAt: typeof ev.occurred_at === 'string' ? ev.occurred_at : occurredAt,
          createdAt:
            typeof ev.created_at === 'string' ? ev.created_at : new Date().toISOString(),
          eventType: 'note',
          eventId: typeof ev.id === 'string' ? ev.id : undefined,
          recordingDurationSec: recordingDurationRef.current,
        });
        recordingDurationRef.current = undefined;
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
    occurredAtRef.current = new Date().toISOString();
    recordingDurationRef.current = recordingElapsedSecRef.current;
    void stopRecording();
  };
  apiRef.current.cancel = () => {
    occurredAtRef.current = null;
    void cancelRecording();
    if (!busy) finishSession();
  };
  apiRef.current.submitText = async () => {
    throw new Error('Text send is not available for orbit journal capture.');
  };

  useEffect(() => {
    recordingElapsedSecRef.current = recordingElapsedSec;
  }, [recordingElapsedSec]);

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
    const processingLabel = busy ? voiceCopy.procedureTranscribing : null;
    setPhase({
      recording,
      processing: busy,
      recordingLevel,
      recordingElapsedSec,
      processingLabel,
    });
  }, [
    active,
    busy,
    processing,
    recording,
    recordingElapsedSec,
    recordingLevel,
    saving,
    setPhase,
    voiceCopy.procedureTranscribing,
  ]);

  return null;
}
