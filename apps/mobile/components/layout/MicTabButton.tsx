import { useTheme } from '@/context/ThemeContext';
import { useVisionCapture } from '@/context/VisionCaptureContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: { selected?: boolean };
  style?: StyleProp<ViewStyle>;
};

/** Center tab: hold = voice record; tap = navigate (QR / vision live on assistant orbit). */
export function MicTabButton({ onPress, accessibilityState, style }: Props) {
  const { recording, processing, requestStart, requestStop } = useVoiceCapture();
  const { eyeMode, setEyeMode } = useVisionCapture();
  const { colors } = useTheme();
  const longFired = useRef(false);
  const iconColor = recording ? '#fff' : colors.fabIcon;

  useEffect(() => {
    if (recording || processing) setEyeMode(false);
  }, [recording, processing, setEyeMode]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Stop recording' : 'Hold to record voice'}
      accessibilityState={accessibilityState}
      delayLongPress={420}
      onPressIn={() => {
        longFired.current = false;
      }}
      onLongPress={() => {
        longFired.current = true;
        if (processing) return;
        if (recording) requestStop();
        else requestStart();
      }}
      onPress={(event) => {
        if (longFired.current) return;
        if (processing) {
          onPress?.(event);
          return;
        }
        if (recording) {
          requestStop();
        }
        if (eyeMode) setEyeMode(false);
        onPress?.(event);
      }}
      style={[style, styles.hit]}
    >
      <View
        style={[
          styles.mic,
          { backgroundColor: colors.fabBg, borderColor: colors.fabRing },
          recording && styles.micRecording,
        ]}
      >
        {processing ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : (
          <SymbolView
            name={{
              ios: recording ? 'stop.fill' : 'mic.fill',
              android: recording ? 'stop' : 'mic',
              web: recording ? 'stop' : 'mic',
            }}
            tintColor={iconColor}
            size={28}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    alignItems: 'center',
  },
  mic: {
    position: 'absolute',
    top: -12,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1b4332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  micRecording: {
    backgroundColor: '#9a3412',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 8,
  },
});
