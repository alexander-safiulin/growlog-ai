import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { normalizeGrowCycleStage, stageBandStyle, type FeedChartPeriod, type GrowCycleStage } from '@growlog/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const PERIODS: FeedChartPeriod[] = ['24h', '48h', '7d', '30d', 'cycle', 'previous', 'all'];

export function FeedPeriodPicker({
  period,
  onChange,
}: {
  period: FeedChartPeriod;
  onChange: (p: FeedChartPeriod) => void;
}) {
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
  const { cycle } = useFarmContext();
  const cc = strings.timelineScreen.charts;
  const styles = useThemedStyles(makeStyles);
  const stage = cycle?.stage ? normalizeGrowCycleStage(cycle.stage) : null;
  const fill = stageBandStyle(stage as GrowCycleStage | null, 0.18) ?? colors.surfaceMuted;
  const labels: Record<FeedChartPeriod, string> = {
    '24h': cc.period24h,
    '48h': cc.period48h,
    '7d': cc.period7d,
    '30d': cc.period30d,
    cycle: cc.periodCycle,
    previous: cc.periodPrevious,
    all: cc.periodAll,
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.lead} />
      <View style={styles.grid}>
        {PERIODS.map((p) => {
          const active = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => onChange(p)}
              style={[styles.chip, { backgroundColor: fill }, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.text} numberOfLines={2}>
                {labels[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.foot} />
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    lead: { height: 15 },
    grid: { flexDirection: 'row', gap: 4 },
    chip: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { borderColor: c.text, borderWidth: 2 },
    text: { fontSize: 11, fontWeight: '600', color: c.text, textAlign: 'center' },
    foot: { height: 18, marginTop: 2 },
  });
}
