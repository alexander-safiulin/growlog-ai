import {
  CycleFormDivider,
  CycleFormLabel,
  CycleFormMultilineInput,
} from '@/components/cycle/cycle-form-ui';
import { ProcedureVoiceComposerRow } from '@/components/cycle/ProcedureVoiceComposerRow';
import { AspectPhoto } from '@/components/media/AspectPhoto';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function mergeDictationText(prev: string, next: string) {
  const t = next.trim();
  if (!t) return prev;
  const p = prev.trim();
  if (!p) return t;
  return `${p}\n\n${t}`;
}

export function useCycleJournalCommentComposer({
  active,
  onChangeText,
  onError,
  disabled,
}: {
  active: boolean;
  onChangeText: (next: string) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
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
    setPhase({
      recording,
      processing,
      recordingLevel,
      recordingElapsedSec,
      processingLabel: processing ? copy.procedureTranscribing : null,
    });
  }, [copy.procedureTranscribing, processing, recording, recordingLevel, recordingElapsedSec, setPhase]);

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
    clearPhoto: () => setPhotoPick(null),
    voiceUsedRef,
    recording,
    processing,
    recordingLevel,
    recordingElapsedSec,
    photoSheetOpen,
    setPhotoSheetOpen,
    applyPhotoPick,
    startRecording,
    stopRecording,
    cancelRecording,
    copy,
    photos,
  };
}

export function CycleJournalCommentComposer({
  label,
  placeholder,
  value,
  onChangeText,
  onError,
  capture,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (next: string) => void;
  onError: (message: string | null) => void;
  capture: ReturnType<typeof useCycleJournalCommentComposer>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    cloudEnabled,
    voiceEnabled,
    formBusy,
    photoPick,
    clearPhoto,
    recording,
    processing,
    recordingLevel,
    recordingElapsedSec,
    setPhotoSheetOpen,
    startRecording,
    stopRecording,
    cancelRecording,
    copy,
  } = capture;

  useEffect(() => {
    capture.syncText(value);
  }, [capture, value]);

  return (
    <>
      <CycleFormLabel>{label}</CycleFormLabel>
      <CycleFormMultilineInput
        numberOfLines={5}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={!formBusy}
      />
      {photoPick ? (
        <View style={styles.previewWrap}>
          <AspectPhoto uri={photoPick.uri} maxHeight={520} radius={10} />
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
        <ProcedureVoiceComposerRow
          recording={recording}
          processing={processing}
          recordingLevel={recordingLevel}
          recordingElapsedSec={recordingElapsedSec}
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
            setPhotoSheetOpen(true);
          }}
          onStartVoice={() => {
            onError(null);
            void startRecording();
          }}
          onSendVoice={() => {
            onError(null);
            void stopRecording();
          }}
          onCancelVoice={() => {
            onError(null);
            void cancelRecording();
          }}
          onNeedSignIn={() => onError(copy.procedureVoiceNeedSignIn)}
        />
      </View>
    </>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    previewWrap: { gap: 6 },
    removePhoto: { alignSelf: 'flex-start' },
    removePhotoText: { fontSize: 13, fontWeight: '600', color: c.primary },
    composer: { marginTop: 4, paddingTop: 12, gap: 12 },
  });
}
