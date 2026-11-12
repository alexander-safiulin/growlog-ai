import { VoiceRecordingWave } from '@/components/voice/VoiceRecordingWave';
import { formatRecordingClock } from '@/lib/voice-meter';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  recording: boolean;
  processing: boolean;
  recordingLevel: number;
  recordingElapsedSec: number;
  voiceEnabled: boolean;
  formBusy: boolean;
  voiceHint?: string;
  transcribingLabel: string;
  photoA11y: string;
  voiceStartA11y: string;
  voiceSendA11y: string;
  voiceCancelA11y: string;
  primaryColor: string;
  primaryTextColor: string;
  onOpenPhoto: () => void;
  onStartVoice: () => void;
  onSendVoice: () => void;
  onCancelVoice: () => void;
  onNeedSignIn: () => void;
  /** When false, hide the photo button (e.g. advisor with separate + menu). */
  showPhotoButton?: boolean;
  photoIcon?: 'plus' | 'photo';
  /** Pin hint next to the mic instead of beside the photo button. */
  voiceHintNearMic?: boolean;
  /** Hide inline mic when the tab-bar FAB owns voice capture (e.g. advisor tab). */
  showMicButton?: boolean;
  onOpenText?: () => void;
  textA11y?: string;
  /** Centered photo + keyboard only; hints live elsewhere (e.g. advisor empty state). */
  compactIdle?: boolean;
};

export function VoiceComposerRow({
  recording,
  processing,
  recordingLevel,
  recordingElapsedSec,
  voiceEnabled,
  formBusy,
  voiceHint,
  transcribingLabel,
  photoA11y,
  voiceStartA11y,
  voiceSendA11y,
  voiceCancelA11y,
  onOpenPhoto,
  onStartVoice,
  onSendVoice,
  onCancelVoice,
  onNeedSignIn,
  primaryColor,
  primaryTextColor,
  showPhotoButton = true,
  photoIcon = 'plus',
  voiceHintNearMic = false,
  showMicButton = true,
  onOpenText,
  textA11y,
  compactIdle = false,
}: Props) {
  const styles = useThemedStyles(makeStyles);

  function startVoice() {
    if (!voiceEnabled) {
      onNeedSignIn();
      return;
    }
    onStartVoice();
  }

  const idleHint = processing ? transcribingLabel : voiceHint;
  const iconOnlyIdle = compactIdle && !recording && !processing && !idleHint;

  const photoControl = showPhotoButton ? (
    <Pressable
      style={styles.photoBtn}
      onPress={onOpenPhoto}
      disabled={formBusy || recording}
      accessibilityRole="button"
      accessibilityLabel={photoA11y}
    >
      <SymbolView
        name={
          photoIcon === 'photo'
            ? { ios: 'photo', android: 'photo', web: 'photo' }
            : { ios: 'plus', android: 'add', web: 'add' }
        }
        tintColor={primaryColor}
        size={22}
      />
    </Pressable>
  ) : null;

  const keyboardControl =
    !processing && !recording && !showMicButton && onOpenText ? (
      <Pressable
        style={styles.photoBtn}
        onPress={onOpenText}
        disabled={formBusy || recording}
        accessibilityRole="button"
        accessibilityLabel={textA11y ?? 'Type a message'}
      >
        <SymbolView
          name={{ ios: 'keyboard', android: 'keyboard', web: 'keyboard' }}
          tintColor={primaryColor}
          size={20}
        />
      </Pressable>
    ) : null;

  if (iconOnlyIdle) {
    return (
      <View style={[styles.toolbarTrack, styles.toolbarTrackNearFab]}>
        <View style={styles.rowIconPairNearFab}>
          {photoControl}
          {keyboardControl}
        </View>
      </View>
    );
  }

  if (compactIdle && processing) {
    return (
      <View style={styles.toolbarTrack}>
        <View style={styles.rowStatus}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={[styles.hintCentered, styles.hintActive]} numberOfLines={2}>
            {transcribingLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.toolbarTrack}>
      <View style={styles.row}>
        {photoControl}

        {recording ? (
          <>
            <VoiceRecordingWave active level={recordingLevel} />
            <Text style={styles.clock}>{formatRecordingClock(recordingElapsedSec)}</Text>
            <Pressable
              style={styles.iconBtn}
              onPress={() => void onCancelVoice()}
              accessibilityRole="button"
              accessibilityLabel={voiceCancelA11y}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                tintColor={primaryColor}
                size={18}
              />
            </Pressable>
            <Pressable
              style={styles.sendBtn}
              onPress={() => void onSendVoice()}
              accessibilityRole="button"
              accessibilityLabel={voiceSendA11y}
            >
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                tintColor={primaryTextColor}
                size={18}
              />
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.middleFill}>
              {processing ? <ActivityIndicator size="small" color={primaryColor} /> : null}
              {idleHint ? (
                <Text
                  style={[
                    voiceHintNearMic ? styles.hintCentered : styles.hint,
                    processing && styles.hintActive,
                  ]}
                  numberOfLines={voiceHintNearMic ? 3 : 2}
                >
                  {idleHint}
                </Text>
              ) : null}
            </View>
            {!processing && showMicButton ? (
              <Pressable
                style={styles.micBtn}
                onPress={startVoice}
                disabled={formBusy}
                accessibilityRole="button"
                accessibilityLabel={voiceStartA11y}
              >
                <SymbolView
                  name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
                  tintColor={primaryTextColor}
                  size={18}
                />
              </Pressable>
            ) : null}
            {keyboardControl}
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    toolbarTrack: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
    },
    rowIconPair: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      minHeight: 44,
      paddingVertical: 2,
    },
    toolbarTrackNearFab: {
      paddingVertical: 2,
      marginBottom: -2,
    },
  /** ~62px FAB + small shoulder gap — icons sit beside the center mic. */
    rowIconPairNearFab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 76,
      minHeight: 40,
    },
    rowStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 12,
    },
    photoBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    middleFill: {
      flex: 1,
      minWidth: 0,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 4,
    },
    hint: {
      flexShrink: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.textMuted,
      textAlign: 'center',
    },
    hintCentered: {
      flexShrink: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.textMuted,
      textAlign: 'center',
    },
    hintActive: { color: c.primary, fontWeight: '600' },
    clock: {
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
      color: c.primary,
      minWidth: 36,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
