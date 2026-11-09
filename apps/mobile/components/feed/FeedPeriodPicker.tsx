import { FEED_CHARTS_KEY } from '@/components/feed/useFeedCharts';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  chartPeriodBounds,
  earliestCycleStart,
  farmCalendarDateString,
  fetchGrowCyclesForFarm,
  formatGrowerCalendarDate,
  normalizeGrowCycleStage,
  previousCycleSpan,
  previousCycleWindow,
  stageBandStyle,
  type FeedChartPeriod,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const PERIODS: FeedChartPeriod[] = ['24h', '48h', '7d', '30d', 'cycle', 'previous', 'all'];

export function FeedPeriodPicker({
  period,
  onChange,
}: {
  period: FeedChartPeriod;
  onChange: (p: FeedChartPeriod) => void;
}) {
  const { strings, locale } = useMobileLocale();
  const { colors } = useTheme();
  const { cycle, farmId, supabase, isLocalWorkspace, displayFarmTimezone } = useFarmContext();
  const cc = strings.timelineScreen.charts;
  const styles = useThemedStyles(makeStyles);
  const stage = cycle?.stage ? normalizeGrowCycleStage(cycle.stage) : null;
  const fill = stageBandStyle(stage as GrowCycleStage | null, 0.18) ?? colors.surfaceMuted;
  const timeZone = displayFarmTimezone || 'UTC';
  const today = farmCalendarDateString(timeZone);
  const cyclesQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'cycles', farmId],
    enabled: Boolean(farmId) && !isLocalWorkspace && (period === 'previous' || period === 'all'),
    queryFn: () => fetchGrowCyclesForFarm(supabase, farmId!),
  });
  const rangeLabel = useMemo(() => {
    if (!cycle) return '';
    let spanStart: string | undefined;
    let spanEnd: string | undefined;
    if (period === 'previous') {
      const previous = previousCycleSpan(cyclesQuery.data ?? [], cycle.id);
      const window = previous ? previousCycleWindow(previous, cycle.start_date, today) : null;
      if (!window) return cc.noPreviousCycle;
      spanStart = window.fromDate;
      spanEnd = window.toDate;
    } else if (period === 'all') {
      spanStart = earliestCycleStart(cyclesQuery.data ?? [], cycle.start_date);
      spanEnd = today;
    }
    const bounds = chartPeriodBounds({
      period,
      today,
      timeZone,
      cycleStartDate: cycle.start_date,
      spanStart,
      spanEnd,
    });
    return formatChartSpan(bounds.fromDate, bounds.toDate, locale);
  }, [cycle, period, cyclesQuery.data, today, timeZone, locale, cc.noPreviousCycle]);
  const anchor =
    period === 'cycle'
      ? cc.anchorCycle
      : period === 'previous'
        ? cc.anchorPrevious
        : period === 'all'
          ? cc.anchorAll
          : cc.anchorRolling;
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
      <Text style={styles.legend} numberOfLines={1}>
        {cc.periodLegend}
      </Text>
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
      <View style={styles.footer}>
        <Text style={styles.anchor} numberOfLines={1}>
          {anchor}
        </Text>
        <Text style={styles.range} numberOfLines={1}>
          {rangeLabel}
        </Text>
      </View>
    </View>
  );
}

function formatChartSpan(from: string, to: string, locale: string): string {
  if (from === to) return formatGrowerCalendarDate(to, locale, { includeYear: true });
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const start = formatGrowerCalendarDate(from, locale, { includeYear: !sameYear });
  const end = formatGrowerCalendarDate(to, locale, { includeYear: true });
  return `${start} – ${end}`;
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    legend: { fontSize: 11, color: c.textMuted, textAlign: 'center' },
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
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 2,
    },
    anchor: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: c.primary },
    range: { flexShrink: 1, fontSize: 12, color: c.textMuted, textAlign: 'right' },
  });
}
