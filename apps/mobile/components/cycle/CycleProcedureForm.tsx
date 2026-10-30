import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { enqueueLogEntry } from '@/lib/offline-queue';
import { preparePhotoForStorage } from '@/lib/prepare-photo';
import { uploadPhotoCapture, type PhotoPickResult } from '@/lib/photo-upload';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import {
  CycleFormCard,
  CycleFormDivider,
  CycleFormErrors,
  CycleFormLabel,
  CycleFormMultilineInput,
  CycleFormMuted,
  CycleFormPrefillDate,
  CycleFormPrimaryButton,
  CycleFormScreen,
} from '@/components/cycle/cycle-form-ui';
import { ProcedurePhotoPickerSheet } from '@/components/cycle/ProcedurePhotoPickerSheet';
import { AspectPhoto } from '@/components/media/AspectPhoto';
import { ProcedureVoiceComposerRow } from '@/components/cycle/ProcedureVoiceComposerRow';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  appendLocalJournalEntry,
  createLogEntry,
  findReusablePhotoCapture,
  formatGrowerEventDateTime,
  formatPhotoSizeLimit,
  getMaxPhotoBytesVisionClient,
  linkMediaToEvent,
  occurredAtOnFarmCalendarDay,
} from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const photos = strings.photosScreen;
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
  const [photoPick, setPhotoPick] = useState<PhotoPickResult | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const voiceUsedRef = useRef(false);
  const savedParentIdRef = useRef<string | null>(null);
  const uploadedPhotoRef = useRef<{ eventId: string; mediaAssetId: string } | null>(null);
  const submitLockRef = useRef(false);
  const clientRequestIdRef = useRef<string | null>(null);
  const occurredAtRef = useRef<string | null>(null);
  const [occurredAtTick, setOccurredAtTick] = useState(() => Date.now());
  const cloudEnabled = !isLocalWorkspace && !!userId;
  const voiceEnabled = cloudEnabled;
  const maxPhotoBytes = getMaxPhotoBytesVisionClient();
  const { register, setPhase } = useVoiceCapture();

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

  const applyTranscript = useCallback((text: string) => {
    voiceUsedRef.current = true;
    setBody((prev) => mergeDictationText(prev, text));
    setFieldError(null);
    setError(null);
  }, []);

  const onVoiceError = useCallback(
    (message: string) => {
      setError(mapVoiceApiError(message, copy));
    },
    [copy],
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
    enabled: voiceEnabled,
    language: locale,
    onTranscript: applyTranscript,
    onError: onVoiceError,
  });

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
    applyTranscript(text);
  };

  useEffect(() => {
    return register({
      start: () => apiRef.current.start(),
      stop: () => apiRef.current.stop(),
      cancel: () => apiRef.current.cancel(),
      submitText: (text) => apiRef.current.submitText(text),
    });
  }, [register]);

  useEffect(() => {
    setPhase({
      recording,
      processing,
      recordingLevel,
      recordingElapsedSec,
      processingLabel: processing ? copy.procedureTranscribing : null,
    });
  }, [copy.procedureTranscribing, processing, recording, recordingLevel, recordingElapsedSec, setPhase]);

  if (!cycle || !farmId || !scopeId) {
    return <CycleFormMuted>{copy.noActive}</CycleFormMuted>;
  }

  async function applyPhotoPick(pick: PhotoPickResult) {
    setPhotoSheetOpen(false);
    try {
      const stored = await preparePhotoForStorage(pick);
      if (stored.fileSize > maxPhotoBytes) {
        setError(
          photos.tooLarge
            .replace('{size}', formatPhotoSizeLimit(stored.fileSize))
            .replace('{max}', formatPhotoSizeLimit(maxPhotoBytes)),
        );
        return;
      }
      uploadedPhotoRef.current = null;
      setPhotoPick(stored);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : photos.permissionRequired);
    }
  }

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

  const voiceBusy = recording || processing;
  const formBusy = pending || voiceBusy;

  return (
    <>
      <CycleFormScreen>
        <CycleFormCard>
          <CycleFormPrefillDate
            label={copy.logPrefillDateTime.replace(
              '{dateTime}',
              formatGrowerEventDateTime(displayOccurredAt, locale, farmTz),
            )}
          />
          <CycleFormLabel>{copy.procedureLabel}</CycleFormLabel>
          <CycleFormMultilineInput
            numberOfLines={6}
            value={body}
            onChangeText={setBody}
            placeholder={copy.procedurePlaceholder}
            editable={!formBusy}
          />
          {photoPick ? (
            <View style={styles.previewWrap}>
              <AspectPhoto uri={photoPick.uri} maxHeight={520} radius={10} />
              <Pressable
                style={styles.removePhoto}
                onPress={() => {
                  setPhotoPick(null);
                  uploadedPhotoRef.current = null;
                }}
                accessibilityRole="button"
                accessibilityLabel={copy.procedureRemovePhoto}
              >
                <Text style={styles.removePhotoText}>{copy.procedureRemovePhoto}</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            <CycleFormDivider />
            <ProcedureVoiceComposerRow
              recording={recording}
              processing={processing}
              recordingLevel={recordingLevel}
              recordingElapsedSec={recordingElapsedSec}
              voiceEnabled={voiceEnabled}
              formBusy={formBusy}
              voiceHint={copy.procedureVoiceHint}
              transcribingLabel={copy.procedureTranscribing}
              photoA11y={copy.procedurePhotoA11y}
              voiceStartA11y={copy.procedureVoiceA11y}
              voiceSendA11y={copy.procedureVoiceSendA11y}
              voiceCancelA11y={copy.procedureVoiceCancelA11y}
              primaryColor={colors.primary}
              primaryTextColor={colors.primaryText}
              onOpenPhoto={() => {
                if (!cloudEnabled) {
                  setError(copy.procedurePhotoNeedSignIn);
                  return;
                }
                setPhotoSheetOpen(true);
              }}
              onStartVoice={() => {
                setError(null);
                void startRecording();
              }}
              onSendVoice={() => {
                setError(null);
                void stopRecording();
              }}
              onCancelVoice={() => {
                setError(null);
                void cancelRecording();
              }}
              onNeedSignIn={() => setError(copy.procedureVoiceNeedSignIn)}
            />
          </View>
        </CycleFormCard>
        <CycleFormErrors fieldError={fieldError} error={error} />
        <CycleFormPrimaryButton
          label={copy.logSubmit}
          onPress={submit}
          pending={pending}
          disabled={formBusy}
        />
      </CycleFormScreen>
      <ProcedurePhotoPickerSheet
        visible={photoSheetOpen}
        permissionRequiredLabel={photos.permissionRequired}
        takePhotoLabel={photos.takePhoto}
        chooseGalleryLabel={photos.chooseGallery}
        onClose={() => setPhotoSheetOpen(false)}
        onPick={(pick) => {
          setError(null);
          applyPhotoPick(pick);
        }}
        onError={(message) => setError(message)}
      />
    </>
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

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    previewWrap: { gap: 6 },
    removePhoto: { alignSelf: 'flex-start' },
    removePhotoText: { fontSize: 13, fontWeight: '600', color: c.primary },
    composer: { marginTop: 4, paddingTop: 12, gap: 12 },
  });
}
