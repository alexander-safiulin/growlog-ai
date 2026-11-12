import { LucideNotebookDot } from '@/components/icons/LucideNotebookDot';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { SymbolView } from 'expo-symbols';
import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

type OrbitIcon = 'photo' | 'leaf' | 'keyboard' | 'qrcode' | 'journalVoice' | 'eye';

const ORBIT_HEIGHT = 120;
const BUTTON_SIZE = 44;
const CENTER_VOICE_SIZE = BUTTON_SIZE;
const ORBIT_RADIUS = 102;
const FAB_CLEARANCE = 14;
const ARC_CENTER_Y = ORBIT_HEIGHT - FAB_CLEARANCE;
const VOICE_CLEARANCE = 12;
const ORBIT_TOP_INSET = Math.max(
  0,
  Math.ceil(ORBIT_RADIUS + BUTTON_SIZE / 2 - (ORBIT_HEIGHT - FAB_CLEARANCE)),
);
/** Wide arc — ~152° so taps do not crowd (≥48pt between centers). */
const ARC_START = Math.PI * 0.92;
const ARC_END = Math.PI * 0.08;
const HIT_SLOP = 6;

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
    voiceDisabled?: boolean;
    voiceStartA11y: string;
    voiceStopA11y: string;
  };
};

function orbitPosition(
  index: number,
  count: number,
  width: number,
): { left: number; top: number } {
  const cx = width / 2;
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const angle = ARC_START + (ARC_END - ARC_START) * t;
  const x = cx + ORBIT_RADIUS * Math.cos(angle);
  const y = ARC_CENTER_Y - ORBIT_RADIUS * Math.sin(angle);
  return { left: x - BUTTON_SIZE / 2, top: y - BUTTON_SIZE / 2 };
}

function orbitCenterVoicePosition(width: number, count: number): { left: number; top: number } {
  const cx = width / 2;
  const crownIndex = Math.floor((count - 1) / 2);
  const crownBottom = orbitPosition(crownIndex, count, width).top + BUTTON_SIZE;
  const ceiling = crownBottom + VOICE_CLEARANCE;
  const floor = ORBIT_HEIGHT - CENTER_VOICE_SIZE - VOICE_CLEARANCE;
  return {
    left: cx - CENTER_VOICE_SIZE / 2,
    top: ceiling + Math.max(0, floor - ceiling) / 2,
  };
}

function OrbitCenterVoiceButton({
  disabled,
  voiceStartA11y,
  voiceStopA11y,
  left,
  top,
  styles,
}: {
  disabled?: boolean;
  voiceStartA11y: string;
  voiceStopA11y: string;
  left: number;
  top: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { recording, processing, requestStart, requestStop } = useVoiceCapture();
  const { colors } = useTheme();
  const longFired = useRef(false);
  const iconColor = recording ? '#fff' : colors.primary;

  return (
    <Pressable
      style={[
        styles.centerVoice,
        {
          left,
          top,
          width: CENTER_VOICE_SIZE,
          height: CENTER_VOICE_SIZE,
          borderRadius: CENTER_VOICE_SIZE / 2,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        disabled && styles.centerVoiceDisabled,
        recording && styles.centerVoiceRecording,
        processing && !recording && styles.centerVoiceProcessing,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={recording ? voiceStopA11y : voiceStartA11y}
      accessibilityState={{ disabled: !!disabled }}
      delayLongPress={420}
      onPressIn={() => {
        longFired.current = false;
      }}
      onLongPress={() => {
        if (disabled) return;
        longFired.current = true;
        if (processing) return;
        if (recording) requestStop();
        else requestStart();
      }}
      onPress={() => {
        if (disabled) return;
        if (longFired.current) return;
        if (processing) return;
        if (recording) requestStop();
      }}
      hitSlop={HIT_SLOP}
    >
      <SymbolView
        name={{
          ios: recording ? 'stop.fill' : 'mic.fill',
          android: recording ? 'stop' : 'mic',
          web: recording ? 'stop' : 'mic',
        }}
        tintColor={disabled ? colors.textMuted : iconColor}
        size={20}
      />
    </Pressable>
  );
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
  const iconMap: Record<Exclude<OrbitIcon, 'journalVoice'>, { ios: string; android: string; web: string }> = {
    photo: { ios: 'photo', android: 'photo', web: 'photo' },
    leaf: { ios: 'leaf', android: 'eco', web: 'eco' },
    keyboard: { ios: 'keyboard', android: 'keyboard', web: 'keyboard' },
    qrcode: { ios: 'qrcode', android: 'qr_code', web: 'qr_code' },
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
      hitSlop={HIT_SLOP}
    >
      {symbol === 'journalVoice' ? (
        <LucideNotebookDot color={primaryColor} size={20} />
      ) : (
        <SymbolView name={iconMap[symbol]} tintColor={primaryColor} size={20} />
      )}
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
    {
      id: 'qrcode',
      onPress: actions.onQr,
      disabled: actions.qrDisabled ?? true,
      a11y: o.qrA11y,
    },
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
    { id: 'journalVoice', onPress: actions.onPlus, disabled: actions.plusDisabled, a11y: o.plusA11y },
  ];

  const arcGuide = useMemo(() => {
    if (width <= 0) return null;
    const cx = width / 2;
    const cy = ARC_CENTER_Y;
    const guideR = ORBIT_RADIUS + BUTTON_SIZE / 2 + 1;
    return {
      left: cx - guideR,
      top: cy - guideR,
      width: guideR * 2,
      height: guideR,
      borderTopLeftRadius: guideR,
      borderTopRightRadius: guideR,
    };
  }, [width]);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.shell} onLayout={onLayout}>
      <View style={styles.track}>
        {arcGuide ? <View style={[styles.arcGuide, arcGuide]} pointerEvents="none" /> : null}
        {width > 0 ? (
          <>
            {items.map((item, index) => {
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
            })}
            <OrbitCenterVoiceButton
              disabled={actions.voiceDisabled}
              voiceStartA11y={actions.voiceStartA11y}
              voiceStopA11y={actions.voiceStopA11y}
              styles={styles}
              {...orbitCenterVoicePosition(width, items.length)}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    shell: {
      height: ORBIT_HEIGHT + ORBIT_TOP_INSET,
      marginBottom: 0,
      position: 'relative',
      overflow: 'visible',
    },
    track: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: ORBIT_HEIGHT,
      overflow: 'visible',
    },
    arcGuide: {
      position: 'absolute',
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    orbitBtn: {
      position: 'absolute',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#102018',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    orbitBtnDisabled: { opacity: 0.34 },
    centerVoice: {
      position: 'absolute',
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#102018',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    centerVoiceDisabled: { opacity: 0.38 },
    centerVoiceRecording: {
      backgroundColor: '#9a3412',
      borderColor: '#9a3412',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.32,
      shadowRadius: 8,
      elevation: 8,
    },
    centerVoiceProcessing: { opacity: 0.45 },
  });
}
