import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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

const LOOK_MS = 2200;

/** Local preview only. No camera, no vision API, no farm facts. */
export function MicTabButton({ onPress, accessibilityState, style }: Props) {
  const { recording, processing, requestStart, requestStop } = useVoiceCapture();
  const { colors } = useTheme();
  const [looking, setLooking] = useState(false);
  const longFired = useRef(false);
  const lookX = useRef(new Animated.Value(0)).current;
  const showEye = looking && !recording && !processing;
  const iconColor = recording ? '#fff' : colors.fabIcon;

  useEffect(() => {
    if (recording || processing) setLooking(false);
  }, [recording, processing]);

  useEffect(() => {
    if (!looking) {
      lookX.setValue(0);
      return;
    }
    const anim = Animated.sequence([
      Animated.timing(lookX, {
        toValue: -7,
        duration: 480,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lookX, {
        toValue: 7,
        duration: 860,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lookX, {
        toValue: 0,
        duration: 520,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    const timer = setTimeout(() => setLooking(false), LOOK_MS);
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [looking, lookX]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        showEye
          ? 'Vision preview. Tap to return to the microphone.'
          : recording
            ? 'Stop recording'
            : 'Record a log or question. Hold to preview vision.'
      }
      accessibilityState={accessibilityState}
      delayLongPress={420}
      onPressIn={() => {
        longFired.current = false;
      }}
      onLongPress={() => {
        longFired.current = true;
        if (recording || processing) return;
        setLooking((on) => !on);
      }}
      onPress={(event) => {
        if (longFired.current) return;
        if (looking) {
          setLooking(false);
          onPress?.(event);
          return;
        }
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
          showEye && styles.micLooking,
        ]}
      >
        {processing ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : showEye ? (
          <View style={styles.eye}>
            <View style={styles.iris} />
            <Animated.View style={[styles.pupil, { transform: [{ translateX: lookX }] }]}>
              <View style={styles.catchlight} />
            </Animated.View>
          </View>
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
  micLooking: {
    backgroundColor: '#10261b',
    borderColor: '#d7eef2',
  },
  eye: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f4f7f2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iris: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3d7a62',
  },
  pupil: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#102018',
  },
  catchlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#f7fbf8',
  },
});
