import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { SymbolView } from 'expo-symbols';
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

export function MicTabButton({ onPress, accessibilityState, style }: Props) {
  const { recording, processing, requestStart, requestStop } = useVoiceCapture();
  const { colors } = useTheme();
  const iconColor = recording ? '#fff' : colors.fabIcon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Stop recording' : 'Record a log or question'}
      accessibilityState={accessibilityState}
      onPress={(event) => {
        if (recording) requestStop();
        else if (!processing) requestStart();
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
