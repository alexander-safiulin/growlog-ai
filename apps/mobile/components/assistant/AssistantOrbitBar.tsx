import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

type OrbitIcon = 'photo' | 'leaf' | 'keyboard' | 'qrcode' | 'plus' | 'eye';

const ORBIT_HEIGHT = 98;
const BUTTON_SIZE = 42;
const ORBIT_RADIUS = 78;
/** Arc from left (π) to right (0) on the upper semicircle. */
const ARC_START = Math.PI * 0.94;
const ARC_END = Math.PI * 0.06;

type OrbitAction = {
  id: OrbitIcon;
  onPress?: () => void;
  disabled?: boolean;
  a11y: string;
};

type Props = {
  actions: {
    onPhoto: () => void;
    onLeaf: () => void;
    onKeyboard: () => void;
    onQr: () => void;
    onPlus: () => void;
    onEye?: () => void;
    eyeDisabled?: boolean;
    photoDisabled?: boolean;
    leafDisabled?: boolean;
    keyboardDisabled?: boolean;
    qrDisabled?: boolean;
    plusDisabled?: boolean;
  };
};

function orbitPosition(
  index: number,
  count: number,
  width: number,
): { left: number; top: number } {
  const cx = width / 2;
  const cy = ORBIT_HEIGHT - 6;
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const angle = ARC_START + (ARC_END - ARC_START) * t;
  const x = cx + ORBIT_RADIUS * Math.cos(angle);
  const y = cy - ORBIT_RADIUS * Math.sin(angle);
  return { left: x - BUTTON_SIZE / 2, top: y - BUTTON_SIZE / 2 };
}

function OrbitButton({
  symbol,
  onPress,
  disabled,
  a11y,
  primaryColor,
  styles,
  left,
  top,
}: {
  symbol: OrbitIcon;
  onPress?: () => void;
  disabled?: boolean;
  a11y: string;
  primaryColor: string;
  styles: ReturnType<typeof makeStyles>;
  left: number;
  top: number;
}) {
  const iconMap: Record<OrbitIcon, { ios: string; android: string; web: string }> = {
    photo: { ios: 'photo', android: 'photo', web: 'photo' },
    leaf: { ios: 'leaf', android: 'eco', web: 'eco' },
    keyboard: { ios: 'keyboard', android: 'keyboard', web: 'keyboard' },
    qrcode: { ios: 'qrcode', android: 'qr_code', web: 'qr_code' },
    plus: { ios: 'plus', android: 'add', web: 'add' },
    eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  };

  return (
    <Pressable
      style={[
        styles.orbitBtn,
        { left, top, width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2 },
        disabled && styles.orbitBtnDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
    >
      <SymbolView name={iconMap[symbol]} tintColor={primaryColor} size={20} />
    </Pressable>
  );
}

export function AssistantOrbitBar({ actions }: Props) {
  const { strings } = useMobileLocale();
  const o = strings.advisorScreen.orbit;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);

  const items: OrbitAction[] = [
    { id: 'qrcode', onPress: actions.onQr, disabled: actions.qrDisabled, a11y: o.qrA11y },
    { id: 'photo', onPress: actions.onPhoto, disabled: actions.photoDisabled, a11y: o.photoA11y },
    { id: 'leaf', onPress: actions.onLeaf, disabled: actions.leafDisabled, a11y: o.leafA11y },
    {
      id: 'eye',
      onPress: actions.onEye,
      disabled: actions.eyeDisabled ?? true,
      a11y: o.eyeA11y,
    },
    {
      id: 'keyboard',
      onPress: actions.onKeyboard,
      disabled: actions.keyboardDisabled,
      a11y: o.keyboardA11y,
    },
    { id: 'plus', onPress: actions.onPlus, disabled: actions.plusDisabled, a11y: o.plusA11y },
  ];

  const arcStyle = useMemo(() => {
    if (width <= 0) return null;
    const cx = width / 2;
    const cy = ORBIT_HEIGHT - 6;
    const ring = ORBIT_RADIUS + BUTTON_SIZE / 2 + 4;
    return {
      left: cx - ring,
      top: cy - ring,
      width: ring * 2,
      height: ring,
      borderTopLeftRadius: ring,
      borderTopRightRadius: ring,
    };
  }, [width]);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.shell} onLayout={onLayout}>
      {arcStyle ? <View style={[styles.arcRing, arcStyle]} pointerEvents="none" /> : null}
      {width > 0
        ? items.map((item, index) => {
            const pos = orbitPosition(index, items.length, width);
            return (
              <OrbitButton
                key={item.id}
                symbol={item.id}
                onPress={item.onPress}
                disabled={item.disabled}
                a11y={item.a11y}
                primaryColor={colors.primary}
                styles={styles}
                left={pos.left}
                top={pos.top}
              />
            );
          })
        : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    shell: {
      height: ORBIT_HEIGHT,
      marginBottom: 2,
      position: 'relative',
    },
    arcRing: {
      position: 'absolute',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
      backgroundColor: c.surfaceMuted,
      opacity: 0.55,
    },
    orbitBtn: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#1b4332',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    orbitBtnDisabled: { opacity: 0.38 },
  });
}
