import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const BAR_COUNT = 28;
const MIN_BAR = 3;
const MAX_BAR = 24;

type Props = {
  active: boolean;
  level: number;
};

export function VoiceRecordingWave({ active, level }: Props) {
  const styles = useThemedStyles(makeStyles);
  const heightsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const levelRef = useRef(level);
  const [, frame] = useState(0);
  levelRef.current = level;

  useEffect(() => {
    if (!active) {
      heightsRef.current = Array(BAR_COUNT).fill(0);
      return;
    }
    const id = setInterval(() => {
      const prev = heightsRef.current;
      const shifted = prev.slice(1);
      const current = levelRef.current;
      const t = Date.now() / 110;
      const audible = current > 0.04;
      const sample = audible ? current * (0.5 + 0.5 * Math.abs(Math.sin(t + shifted.length * 0.62))) : 0;
      shifted.push(sample);
      heightsRef.current = shifted;
      frame((n) => n + 1);
    }, 75);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const bars = heightsRef.current;

  return (
    <View style={styles.track} accessibilityLabel="Recording level">
      {bars.map((h, i) => {
        const height = MIN_BAR + h * (MAX_BAR - MIN_BAR);
        const loud = h > 0.06;
        return (
          <View
            key={i}
            style={[styles.bar, loud ? styles.barActive : styles.barIdle, { height }]}
          />
        );
      })}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    track: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: MAX_BAR,
      gap: 2,
      minWidth: 0,
    },
    bar: {
      flex: 1,
      borderRadius: 2,
      maxWidth: 5,
    },
    barActive: { backgroundColor: c.primary },
    barIdle: { backgroundColor: c.border },
  });
}
