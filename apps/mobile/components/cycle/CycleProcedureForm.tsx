import {
  CycleFormCard,
  CycleFormErrors,
  CycleFormMuted,
  CycleFormPrefillDate,
  CycleFormPrimaryButton,
  CycleFormScreen,
} from '@/components/cycle/cycle-form-ui';
import { JournalVoiceFieldSection, useJournalVoiceField } from '@/components/voice/JournalVoiceField';
import { useMobileLocale } from '@/context/LocaleContext';
import { enqueueLogEntry } from '@/lib/offline-queue';
import { uploadPhotoCapture } from '@/lib/photo-upload';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  appendLocalJournalEntry,
  createLogEntry,
  findReusablePhotoCapture,
  formatGrowerEventDateTime,
  linkMediaToEvent,
  occurredAtOnFarmCalendarDay,
} from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

const PROCEDURE_PAYLOAD = { procedure: true } as const;

export function CycleProcedureForm({
  onSubmitted,
  prefillDate,
}: {
  onSubmitted?: () => void;
  prefillDate?: string;
}) {
  const { strings, locale } = useMobileLocale();
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
  const savedParentIdRef = useRef<string | null>(null);
  const uploadedPhotoRef = useRef<{ eventId: string; mediaAssetId: string } | null>(null);
  const submitLockRef = useRef(false);
  const clientRequestIdRef = useRef<string | null>(null);
  const occurredAtRef = useRef<string | null>(null);
  const [occurredAtTick, setOccurredAtTick] = useState(() => Date.now());

  const onVoiceFieldError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  const voiceField = useJournalVoiceField({
    onChangeText: (next) => {
      setBody(next);
      setFieldError(null);
      setError(null);
    },
    onError: onVoiceFieldError,
    disabled: pending,
    onPhotoRemoved: () => {
      uploadedPhotoRef.current = null;
    },
  });

  useEffect(() => {
    if (occurredAtRef.current) return undefined;
    const id = setInterval(() => setOccurredAtTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  function resolveProcedureOccurredAt(now = new Date()) {
    return prefillDate
      ? occurredAtOnFarmCalendarDay(prefillDate, farmTz, now)
      : now.toISOString();
  }

  const displayOccurredAt =
    occurredAtRef.current ?? resolveProcedureOccurredAt(new Date(occurredAtTick));

  useEffect(() => {
    voiceField.syncText(body);
  }, [body, voiceField]);

  if (!cycle || !farmId || !scopeId) {
    return <CycleFormMuted>{copy.noActive}</CycleFormMuted>;
  }

  const { photoPick, voiceUsedRef, cloudEnabled } = voiceField;

  function clearAttemptRefs() {
    savedParentIdRef.current = null;
    uploadedPhotoRef.current = null;
    clientRequestIdRef.current = null;
    occurredAtRef.current = null;
  }

  async function submit() {
    if (submitLockRef.current) return;
    if (!cycle || !farmId || !scopeId) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setFieldError(copy.procedureRequired);
      return;
    }
    submitLockRef.current = true;
    setFieldError(null);
    setError(null);
    setPending(true);
    if (!clientRequestIdRef.current) clientRequestIdRef.current = crypto.randomUUID();
    if (!occurredAtRef.current) {
      occurredAtRef.current = resolveProcedureOccurredAt();
      setOccurredAtTick(Date.parse(occurredAtRef.current));
    }
    const occurredAt = occurredAtRef.current;
    const clientRequestId = clientRequestIdRef.current;
    const sourceType = voiceUsedRef.current ? ('user_voice' as const) : ('user_form' as const);
    const eventPayload = voiceUsedRef.current
      ? { ...PROCEDURE_PAYLOAD, voice: { dictated: true }, client_request_id: clientRequestId }
      : { ...PROCEDURE_PAYLOAD, client_request_id: clientRequestId };

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
        clearAttemptRefs();
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
        if (photoPick && cloudEnabled) {
          await uploadPhotoCapture(supabase, {
            farmId,
            cycleId: cycle.id,
            scopeId,
            pick: photoPick,
            caption: trimmed,
            capturedAt: occurredAt,
            userId,
          });
        }
        clearAttemptRefs();
        refetchAll();
        onSubmitted?.();
        return;
      }

      let parentEventId = savedParentIdRef.current;
      if (!parentEventId) {
        const logResult = await createLogEntry(supabase, payload);
        const id = logResult.event.id;
        if (typeof id !== 'string' || !id) throw new Error(capture.saveFailed);
        savedParentIdRef.current = id;
        parentEventId = id;
      }

      if (photoPick && cloudEnabled) {
        let uploaded = uploadedPhotoRef.current;
        if (!uploaded) {
          uploaded = await findReusablePhotoCapture(supabase, {
            farmId,
            cycleId: cycle.id,
            scopeId,
            body: trimmed,
            occurredAt,
            parentEventId,
          });
        }
        if (!uploaded) {
          const photoOutcome = await uploadPhotoCapture(supabase, {
            farmId,
            cycleId: cycle.id,
            scopeId,
            pick: photoPick,
            caption: trimmed,
            capturedAt: occurredAt,
            userId,
            offlineOk: false,
          });
          if (photoOutcome.status !== 'uploaded') {
            throw new Error(copy.procedurePhotoAttachFailed);
          }
          uploaded = {
            eventId: photoOutcome.eventId,
            mediaAssetId: photoOutcome.mediaAssetId,
          };
        }
        uploadedPhotoRef.current = uploaded;
        await linkMediaToEvent(supabase, {
          farmId,
          parentEventId,
          mediaAssetId: uploaded.mediaAssetId,
          photoEventId: uploaded.eventId,
        });
      }

      clearAttemptRefs();
      refetchAll();
      onSubmitted?.();
    } catch (e: unknown) {
      if (savedParentIdRef.current) {
        if (photoPick && cloudEnabled) {
          setError(mapProcedureSaveError(e, copy));
          return;
        }
        clearAttemptRefs();
        refetchAll();
        onSubmitted?.();
        return;
      }
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
        if (photoPick && cloudEnabled) {
          await uploadPhotoCapture(supabase, {
            farmId,
            cycleId: cycle.id,
            scopeId,
            pick: photoPick,
            caption: trimmed,
            capturedAt: occurredAt,
            userId,
          });
        }
        clearAttemptRefs();
        refetchAll();
        onSubmitted?.();
        return;
      }
      setError(mapProcedureSaveError(e, copy, capture.saveFailed));
    } finally {
      submitLockRef.current = false;
      setPending(false);
    }
  }

  const formBusy = pending || voiceField.formBusy;

  return (
    <CycleFormScreen>
      <CycleFormCard>
        <CycleFormPrefillDate
          label={formatGrowerEventDateTime(displayOccurredAt, locale, farmTz)}
        />
        <JournalVoiceFieldSection
          label={copy.procedureLabel}
          placeholder={copy.procedurePlaceholder}
          value={body}
          onChangeText={(next) => {
            setBody(next);
            setFieldError(null);
            setError(null);
          }}
          onError={onVoiceFieldError}
          capture={voiceField}
        />
      </CycleFormCard>
      <CycleFormErrors fieldError={fieldError} error={error} />
      <CycleFormPrimaryButton
        label={copy.logSubmit}
        onPress={submit}
        pending={pending}
        disabled={formBusy}
      />
    </CycleFormScreen>
  );
}

function isVoiceAuthError(message: string) {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === 'not signed in' ||
    normalized === 'unauthorized' ||
    normalized.includes('not authenticated') ||
    normalized.includes('jwt')
  );
}

function mapProcedureSaveError(
  e: unknown,
  copy: { procedurePhotoAttachFailed: string; procedureVoiceNeedSignIn: string; procedurePhotoNeedSignIn: string },
  fallback?: string,
): string {
  const message = e instanceof Error ? e.message : fallback ?? copy.procedurePhotoAttachFailed;
  if (isVoiceAuthError(message)) return copy.procedureVoiceNeedSignIn;
  const lower = message.toLowerCase();
  if (lower.includes('link_media_to_event') || lower.includes('could not find the function')) {
    return copy.procedurePhotoAttachFailed;
  }
  if (message === copy.procedurePhotoAttachFailed) return message;
  return message;
}

