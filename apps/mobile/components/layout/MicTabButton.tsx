import { LucideVoicemail } from '@/components/icons/LucideVoicemail';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVisionCapture } from '@/context/VisionCaptureContext';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: { selected?: boolean };
  style?: StyleProp<ViewStyle>;
};

/** Center tab: opens assistant; voice capture lives on the advisor orbit. */
export function MicTabButton({ onPress, accessibilityState, style }: Props) {
  const { eyeMode, setEyeMode } = useVisionCapture();
  const { colors } = useTheme();
  const { strings } = useMobileLocale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.headers.assistant}
      accessibilityState={accessibilityState}
      onPress={(event) => {
        if (eyeMode) setEyeMode(false);
        onPress?.(event);
      }}
      style={[style, styles.hit]}
    >
      <View style={[styles.fab, { backgroundColor: colors.fabBg, borderColor: colors.fabRing }]}>
        <LucideVoicemail color={colors.fabIcon} size={28} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
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
});
