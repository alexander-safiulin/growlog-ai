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

  return (
    <View style={styles.toolbarTrack}>
      <View style={styles.row}>
        {showPhotoButton ? (
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
        ) : null}

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
                  numberOfLines={2}
                >
                  {idleHint}
                </Text>
              ) : null}
            </View>
            {!processing ? (
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
