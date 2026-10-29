import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { enqueueLogEntry } from '@/lib/offline-queue';
import {
  pickPhotoFromDevice,
  uploadPhotoCapture,
  type PhotoPickResult,
} from '@/lib/photo-upload';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  appendLocalJournalEntry,
  createLogEntry,
  formatGrowerPrefillDate,
  formatPhotoSizeLimit,
  getMaxPhotoBytesVisionClient,
  linkMediaToEvent,
  occurredAtForFarmCalendarDay,
} from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const voiceUsedRef = useRef(false);
  const savedParentIdRef = useRef<string | null>(null);
  const uploadedPhotoRef = useRef<{ eventId: string; mediaAssetId: string } | null>(null);
  const cloudEnabled = !isLocalWorkspace && !!userId;
  const voiceEnabled = cloudEnabled;
  const maxPhotoBytes = getMaxPhotoBytesVisionClient();
  const { register, setPhase } = useVoiceCapture();

  const applyTranscript = useCallback((text: string) => {
    voiceUsedRef.current = true;
    setBody((prev) => mergeDictationText(prev, text));
    setFieldError(null);
    setError(null);
  }, []);

  const onVoiceError = useCallback(
    (message: string) => {
      if (isVoiceAuthError(message)) {
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

  async function pickPhoto(source: 'camera' | 'library') {
    if (!cloudEnabled) {
      setError(copy.procedurePhotoNeedSignIn);
      return;
    }
    setError(null);
    setPhotoBusy(true);
    try {
      const pick = await pickPhotoFromDevice(source);
      if (!pick) return;
      if (pick.fileSize > maxPhotoBytes) {
        setError(
          photos.tooLarge
            .replace('{size}', formatPhotoSizeLimit(pick.fileSize))
            .replace('{max}', formatPhotoSizeLimit(maxPhotoBytes)),
        );
        return;
      }
      setPhotoPick(pick);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'permission_required') {
        setError(photos.permissionRequired);
        return;
      }
      setError(e instanceof Error ? e.message : photos.uploadFailed);
    } finally {
      setPhotoBusy(false);
    }
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
          uploadedPhotoRef.current = uploaded;
        }
        await linkMediaToEvent(supabase, {
          farmId,
          parentEventId,
          mediaAssetId: uploaded.mediaAssetId,
          photoEventId: uploaded.eventId,
        });
      }

      refetchAll();
      onSubmitted?.();
    } catch (e: unknown) {
      if (savedParentIdRef.current) {
        setError(copy.procedurePhotoAttachFailed);
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
  const formBusy = pending || voiceBusy || photoBusy;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {prefillDate ? (
            <Text style={styles.date}>
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
            editable={!formBusy}
          />
          {photoPick ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoPick.uri }} style={styles.preview} accessibilityIgnoresInvertColors />
              <Pressable
                style={styles.removePhoto}
                onPress={() => setPhotoPick(null)}
                accessibilityRole="button"
                accessibilityLabel={copy.procedureRemovePhoto}
              >
                <Text style={styles.removePhotoText}>{copy.procedureRemovePhoto}</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Text style={[styles.voiceHint, (recording || processing) && styles.recordingLabel]}>
              {recording
                ? copy.procedureRecording
                : processing
                  ? copy.procedureTranscribing
                  : copy.procedureVoiceHint}
            </Text>
            <View style={styles.toolRow}>
              <Pressable
                style={styles.toolBtn}
                onPress={() => void pickPhoto('camera')}
                disabled={formBusy}
                accessibilityRole="button"
                accessibilityLabel={photos.takePhoto}
              >
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                  tintColor={colors.primary}
                  size={20}
                />
              </Pressable>
              <Pressable
                style={styles.toolBtn}
                onPress={() => void pickPhoto('library')}
                disabled={formBusy}
                accessibilityRole="button"
                accessibilityLabel={photos.chooseGallery}
              >
                <SymbolView
                  name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
                  tintColor={colors.primary}
                  size={20}
                />
              </Pressable>
              <Pressable
                style={[styles.micBtn, recording && styles.micBtnRecording]}
                onPress={() => {
                  if (!voiceEnabled) {
                    setError(copy.procedureVoiceNeedSignIn);
                    return;
                  }
                  setError(null);
                  toggleRecording();
                }}
                disabled={processing || pending || photoBusy}
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
                    tintColor={colors.primaryText}
                    size={18}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
        {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.save, formBusy && styles.saveDisabled]}
          onPress={submit}
          disabled={formBusy}
          accessibilityRole="button"
        >
          {pending ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.saveText}>{copy.logSubmit}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 12, backgroundColor: c.screen },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 8,
    },
    date: { fontSize: 13, fontWeight: '600', color: c.sectionLabel },
    label: { fontSize: 17, fontWeight: '600', color: c.text },
    input: {
      minHeight: 120,
      padding: 0,
      fontSize: 16,
      lineHeight: 22,
      color: c.text,
      backgroundColor: 'transparent',
    },
    previewWrap: { gap: 6 },
    preview: {
      width: '100%',
      height: 160,
      borderRadius: 10,
      backgroundColor: c.surfaceMuted,
    },
    removePhoto: { alignSelf: 'flex-start' },
    removePhotoText: { fontSize: 13, fontWeight: '600', color: c.primary },
    composer: {
      gap: 10,
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
    toolBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voiceHint: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    recordingLabel: { color: c.primary, fontWeight: '600' },
    micBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micBtnRecording: { backgroundColor: '#9a3412' },
    save: {
      backgroundColor: c.primary,
      borderRadius: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    saveDisabled: { opacity: 0.55 },
    saveText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    muted: { padding: 16, color: c.textMuted },
    error: { color: c.dangerText, fontSize: 13, paddingHorizontal: 4 },
  });
}
