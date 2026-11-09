import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { growerStageLabelRu, type StageSpan } from '@growlog/domain';
import { shiftCalendarDate } from '@growlog/domain';
import { StyleSheet, Text, View } from 'react-native';

const STAGE_FILL: Record<string, string> = {
  propagation: '#86efac',
  cloning: '#6ee7b7',
  veg: '#34d399',
  preflower: '#fcd34d',
  flower: '#fbbf24',
  harvest: '#f97316',
  drying: '#d97706',
  trimming: '#a78bfa',
  curing: '#c4b5fd',
  completed: '#9ca3af',
};

function spanDayCount(from: string, to: string): number {
  let n = 0;
  let c = from;
  while (c <= to) {
    n += 1;
    c = shiftCalendarDate(c, 1);
  }
  return Math.max(1, n);
}

export function StageStrip({ spans, cycleStart, today }: { spans: StageSpan[]; cycleStart: string; today: string }) {
  const styles = useThemedStyles(makeStyles);
  const totalDays = spanDayCount(cycleStart, today);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {spans.map((s) => {
          const days = spanDayCount(s.fromDate, s.toDate);
          const flex = days / totalDays;
          const color = STAGE_FILL[s.stage] ?? '#d1d5db';
          return (
            <View
              key={`${s.stage}-${s.fromDate}`}
              style={[styles.seg, { flex, backgroundColor: color }]}
              accessibilityLabel={growerStageLabelRu(s.stage)}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        {spans.slice(-3).map((s) => (
          <Text key={`${s.stage}-lbl`} style={styles.label} numberOfLines={1}>
            {growerStageLabelRu(s.stage)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: 8 },
    row: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
    seg: { minWidth: 4 },
    labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    label: { fontSize: 11, color: c.textMuted },
  });
}
