import { formatRecordingClock } from '@/lib/voice-meter';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const BAR_COUNT = 32;
const MIN_BAR = 3;
const MAX_BAR = 28;

type Props = {
  visible: boolean;
  level: number;
  elapsedSeconds: number;
};

export function VoiceRecordingLiveMeter({ visible, level, elapsedSeconds }: Props) {
  const styles = useThemedStyles(makeStyles);
  const heightsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const levelRef = useRef(level);
  const [, frame] = useState(0);
  levelRef.current = level;

  useEffect(() => {
    if (!visible) {
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
  }, [visible]);

  if (!visible) return null;

  const bars = heightsRef.current;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.clock}>{formatRecordingClock(elapsedSeconds)}</Text>
      <View style={styles.waveTrack}>
        {bars.map((h, i) => {
          const height = MIN_BAR + h * (MAX_BAR - MIN_BAR);
          const loud = h > 0.06;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                loud ? styles.barActive : styles.barIdle,
                { height },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    clock: {
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
      color: c.primary,
      minWidth: 44,
    },
    waveTrack: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: MAX_BAR,
      gap: 2,
    },
    bar: {
      flex: 1,
      borderRadius: 2,
      maxWidth: 6,
    },
    barActive: { backgroundColor: c.primary },
    barIdle: { backgroundColor: c.border },
  });
}
