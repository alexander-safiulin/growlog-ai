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
      <View style={[styles.mic, recording && styles.micRecording]}>
        {processing ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <SymbolView
            name={{
              ios: recording ? 'stop.fill' : 'mic.fill',
              android: recording ? 'stop' : 'mic',
              web: recording ? 'stop' : 'mic',
            }}
            tintColor="#fff"
            size={52}
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
    justifyContent: 'center',
    top: -28,
  },
  mic: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#2d6a4f',
    borderWidth: 4,
    borderColor: '#f4faf5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1b4332',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  micRecording: {
    backgroundColor: '#9a3412',
  },
});
