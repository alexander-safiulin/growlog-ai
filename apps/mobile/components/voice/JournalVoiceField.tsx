import {
  CycleFormDivider,
  CycleFormLabel,
  CycleFormMultilineInput,
} from '@/components/cycle/cycle-form-ui';
import { ProcedurePhotoPickerSheet } from '@/components/cycle/ProcedurePhotoPickerSheet';
import { AspectPhoto } from '@/components/media/AspectPhoto';
import { VoiceComposerRow } from '@/components/voice/VoiceComposerRow';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { preparePhotoForStorage } from '@/lib/prepare-photo';
import type { PhotoPickResult } from '@/lib/photo-upload';
import { useVoiceTranscription } from '@/lib/use-voice-transcription';
import { mapVoiceApiError } from '@/lib/voice-errors';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { formatPhotoSizeLimit, getMaxPhotoBytesVisionClient } from '@growlog/domain';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function mergeDictationText(prev: string, next: string) {
  const t = next.trim();
  if (!t) return prev;
  const p = prev.trim();
  if (!p) return t;
  return `${p}\n\n${t}`;
}

export function useJournalVoiceField({
  active = true,
  onChangeText,
  onError,
  disabled,
  onPhotoRemoved,
}: {
  active?: boolean;
  onChangeText: (next: string) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
  onPhotoRemoved?: () => void;
}) {
  const { strings, locale } = useMobileLocale();
  const copy = strings.cycle;
  const photos = strings.photosScreen;
  const { supabase, userId, isLocalWorkspace } = useFarmContext();
  const cloudEnabled = !isLocalWorkspace && !!userId;
  const voiceEnabled = active && cloudEnabled;
  const voiceUsedRef = useRef(false);
  const textRef = useRef('');
  const [photoPick, setPhotoPick] = useState<PhotoPickResult | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const maxPhotoBytes = getMaxPhotoBytesVisionClient();
  const { register, setPhase } = useVoiceCapture();

  const applyTranscript = useCallback(
    (text: string) => {
      voiceUsedRef.current = true;
      onChangeText(mergeDictationText(textRef.current, text));
      onError(null);
    },
    [onChangeText, onError],
  );

  const onVoiceError = useCallback(
    (message: string) => {
      onError(mapVoiceApiError(message, copy));
    },
    [copy, onError],
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
      processing,
      recordingLevel,
      recordingElapsedSec,
      processingLabel: processing ? copy.procedureTranscribing : null,
    });
  }, [
    active,
    copy.procedureTranscribing,
    processing,
    recording,
    recordingLevel,
    recordingElapsedSec,
    setPhase,
  ]);

  async function applyPhotoPick(pick: PhotoPickResult) {
    setPhotoSheetOpen(false);
    try {
      const stored = await preparePhotoForStorage(pick);
      if (stored.fileSize > maxPhotoBytes) {
        onError(
          photos.tooLarge
            .replace('{size}', formatPhotoSizeLimit(stored.fileSize))
            .replace('{max}', formatPhotoSizeLimit(maxPhotoBytes)),
        );
        return;
      }
      setPhotoPick(stored);
      onError(null);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : photos.permissionRequired);
    }
  }

  const voiceBusy = recording || processing;
  const formBusy = Boolean(disabled) || voiceBusy;

  return {
    syncText: (next: string) => {
      textRef.current = next;
    },
    cloudEnabled,
    voiceEnabled,
    voiceBusy,
    formBusy,
    photoPick,
    clearPhoto: () => {
      setPhotoPick(null);
      onPhotoRemoved?.();
    },
    voiceUsedRef,
    recording,
    processing,
    recordingLevel,
    recordingElapsedSec,
    startRecording,
    stopRecording,
    cancelRecording,
    photoSheetOpen,
    setPhotoSheetOpen,
    applyPhotoPick,
    copy,
    photos,
  };
}

export type JournalVoiceCapture = ReturnType<typeof useJournalVoiceField>;

export function JournalVoiceField({
  label,
  placeholder,
  value,
  onChangeText,
  onError,
  capture,
  compact,
  multilineLines,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (next: string) => void;
  onError: (message: string | null) => void;
  capture: JournalVoiceCapture;
  compact?: boolean;
  multilineLines?: number;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { cloudEnabled, voiceEnabled, formBusy, photoPick, clearPhoto, copy } = capture;

  useEffect(() => {
    capture.syncText(value);
  }, [capture, value]);

  const lines = multilineLines ?? (compact ? 3 : 6);

  return (
    <>
      <CycleFormLabel>{label}</CycleFormLabel>
      <CycleFormMultilineInput
        numberOfLines={lines}
        style={compact ? styles.multilineCompact : undefined}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={!formBusy}
      />
      {photoPick ? (
        <View style={styles.previewWrap}>
          <AspectPhoto uri={photoPick.uri} maxHeight={compact ? 180 : 520} radius={10} />
          <Pressable
            style={styles.removePhoto}
            onPress={clearPhoto}
            accessibilityRole="button"
            accessibilityLabel={copy.procedureRemovePhoto}
          >
            <Text style={styles.removePhotoText}>{copy.procedureRemovePhoto}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composer}>
        <CycleFormDivider />
        <VoiceComposerRow
          recording={capture.recording}
          processing={capture.processing}
          recordingLevel={capture.recordingLevel}
          recordingElapsedSec={capture.recordingElapsedSec}
          voiceEnabled={voiceEnabled}
          formBusy={formBusy}
          voiceHint={copy.procedureVoicePrompt}
          voiceHintNearMic
          transcribingLabel={copy.procedureTranscribing}
          photoA11y={copy.procedurePhotoA11y}
          voiceStartA11y={copy.procedureVoiceA11y}
          voiceSendA11y={copy.procedureVoiceSendA11y}
          voiceCancelA11y={copy.procedureVoiceCancelA11y}
          primaryColor={colors.primary}
          primaryTextColor={colors.primaryText}
          onOpenPhoto={() => {
            if (!cloudEnabled) {
              onError(copy.procedurePhotoNeedSignIn);
              return;
            }
            capture.setPhotoSheetOpen(true);
          }}
          onStartVoice={() => {
            onError(null);
            void capture.startRecording();
          }}
          onSendVoice={() => {
            onError(null);
            void capture.stopRecording();
          }}
          onCancelVoice={() => {
            onError(null);
            void capture.cancelRecording();
          }}
          onNeedSignIn={() => onError(copy.procedureVoiceNeedSignIn)}
        />
      </View>
    </>
  );
}

/** @deprecated use useJournalVoiceField */
export const useCycleJournalCommentComposer = useJournalVoiceField;

/** @deprecated use JournalVoiceField */
export function CycleJournalCommentComposer(
  props: ComponentProps<typeof JournalVoiceField>,
) {
  return <JournalVoiceField {...props} />;
}

export function JournalVoiceFieldSection({
  label,
  placeholder,
  value,
  onChangeText,
  onError,
  capture,
  compact,
  multilineLines,
}: ComponentProps<typeof JournalVoiceField>) {
  return (
    <>
      <JournalVoiceField
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onError={onError}
        capture={capture}
        compact={compact}
        multilineLines={multilineLines}
      />
      <ProcedurePhotoPickerSheet
        visible={capture.photoSheetOpen}
        permissionRequiredLabel={capture.photos.permissionRequired}
        takePhotoLabel={capture.photos.takePhoto}
        chooseGalleryLabel={capture.photos.chooseGallery}
        onClose={() => capture.setPhotoSheetOpen(false)}
        onPick={capture.applyPhotoPick}
        onError={onError}
      />
    </>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    multilineCompact: { minHeight: 64 },
    previewWrap: { gap: 6 },
    removePhoto: { alignSelf: 'flex-start' },
    removePhotoText: { fontSize: 13, fontWeight: '600', color: c.primary },
    composer: { marginTop: 4, paddingTop: 12, gap: 12 },
  });
}
