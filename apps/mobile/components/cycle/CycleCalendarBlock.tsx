import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  aggregateCycleDayMarkers,
  buildCalendarMonthGrid,
  buildStageTimeline,
  farmCalendarDateString,
  fetchCycleCalendarEvents,
  fetchCycleFeedingRowsForRange,
  initialStageForMaterial,
  localJournalCalendarMarkers,
  monthUtcBoundsForFarmMonth,
  parseCalendarDateParts,
  shiftFarmMonth,
  stageBandStyle,
  weekDatesContaining,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDayMarkers } from '@/components/cycle/CalendarDayMarkers';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const WEEK_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function CycleCalendarBlock({
  onSelectDate,
  selectedDate,
  onMonthData,
  displayMode = 'month',
  onToggleDisplayMode,
}: {
  selectedDate?: string | null;
  onSelectDate: (date: string) => void;
  onMonthData?: (data: {
    events: Awaited<ReturnType<typeof fetchCycleCalendarEvents>>;
    feedingRows: Awaited<ReturnType<typeof fetchCycleFeedingRowsForRange>>;
  }) => void;
  displayMode?: 'week' | 'month';
  onToggleDisplayMode?: () => void;
}) {
  const { strings, locale } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, cycle, farms, isLocalWorkspace, localWorkspace } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const today = farmCalendarDateString(farmTz);
  const [y, m] = today.split('-').map(Number);
  const [ym, setYm] = useState({ year: y, month: m });

  useEffect(() => {
    if (!selectedDate) return;
    const parts = parseCalendarDateParts(selectedDate);
    setYm({ year: parts.year, month: parts.month });
  }, [selectedDate]);

  const bounds = useMemo(
    () => monthUtcBoundsForFarmMonth(ym.year, ym.month, farmTz),
    [ym.year, ym.month, farmTz],
  );

  const stageQuery = useQuery({
    queryKey: ['m-cycle-cal-stage', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id && !isLocalWorkspace,
    queryFn: async () => {
      const { fetchStageChangeEvents } = await import('@growlog/domain');
      return fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id });
    },
  });

  const dataQuery = useQuery({
    queryKey: ['m-cycle-cal', farmId, cycle?.id, bounds.fromIso],
    enabled: !!farmId && !!cycle?.id && !isLocalWorkspace,
    queryFn: async () => {
      const [events, feedingRows] = await Promise.all([
        fetchCycleCalendarEvents(supabase, {
          farmId: farmId!,
          cycleId: cycle!.id,
          fromIso: bounds.fromIso,
          toIso: bounds.toIso,
        }),
        fetchCycleFeedingRowsForRange(supabase, {
          farmId: farmId!,
          cycleId: cycle!.id,
          fromIso: bounds.fromIso,
          toIso: bounds.toIso,
        }),
      ]);
      return { events, feedingRows };
    },
  });

  useEffect(() => {
    if (!onMonthData || !dataQuery.data) return;
    onMonthData({
      events: dataQuery.data.events,
      feedingRows: dataQuery.data.feedingRows,
    });
  }, [dataQuery.data, onMonthData]);

  const cells = useMemo(() => {
    if (!cycle) return [];
    const stageEvents =
      isLocalWorkspace && localWorkspace
        ? localWorkspace.journal
            .filter((e) => e.event_type === 'stage_changed')
            .slice()
            .sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1))
            .map((e) => ({ occurred_at: e.occurred_at, payload: e.payload }))
        : (stageQuery.data ?? []);
    const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
    const initialStage =
      (stageEvents[0]?.payload?.from_stage as GrowCycleStage | undefined) ??
      initialStageForMaterial(material);
    const transitions = stageEvents.map((e) => ({
      toStage: (e.payload.to_stage as GrowCycleStage) ?? cycle.stage,
      occurredAt: e.occurred_at,
    }));
    const timeline = buildStageTimeline({
      cycleStartDate: cycle.start_date,
      initialStage,
      transitions,
      timeZone: farmTz,
    });
    const markers = isLocalWorkspace && localWorkspace
      ? localJournalCalendarMarkers(localWorkspace)
      : aggregateCycleDayMarkers({
          events: dataQuery.data?.events ?? [],
          feedingRows: dataQuery.data?.feedingRows ?? [],
          timeZone: farmTz,
        });
    const cycleEndDate =
      cycle.end_date ??
      (cycle.stage === 'completed' || cycle.status === 'harvested' ? today : null);
    return buildCalendarMonthGrid({
      year: ym.year,
      month: ym.month,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
      cycleEndDate,
      stageTimeline: timeline,
      dayMarkers: markers,
    });
  }, [cycle, dataQuery.data, farmTz, isLocalWorkspace, localWorkspace, stageQuery.data, today, ym.month, ym.year]);

  if (!cycle) return null;

  function shiftMonth(delta: number) {
    setYm((prev) => shiftFarmMonth(prev.year, prev.month, delta));
  }

  const anchorDate = selectedDate ?? today;
  const weekSet =
    displayMode === 'week' ? new Set(weekDatesContaining(anchorDate, farmTz)) : null;
  const visibleCells = weekSet ? cells.filter((c) => weekSet.has(c.date)) : cells;

  const monthLabel = formatCalendarMonthYear(ym.year, ym.month, locale);
  const toggleLabel =
    displayMode === 'month' ? strings.timelineScreen.collapseMonth : strings.timelineScreen.expandMonth;

  return (
    <View style={styles.wrap}>
      <View style={styles.weekRow}>
        {WEEK_KEYS.map((k) => (
          <Text key={k} style={styles.weekday}>
            {copy.calWeekday[k]}
          </Text>
        ))}
      </View>
      <View style={[styles.grid, displayMode === 'week' && styles.gridWeek]}>
        {visibleCells.map((cell) => {
          const tint = stageBandStyle(cell.stage, cell.inCycle ? 0.18 : 0.06);
          const selected = selectedDate === cell.date;
          return (
            <Pressable
              key={cell.date}
              onPress={() => onSelectDate(cell.date)}
              style={[
                styles.cell,
                { backgroundColor: tint ?? (cell.isCurrentMonth ? colors.card : colors.surfaceMuted) },
                cell.muted && styles.cellMuted,
                cell.isToday && styles.cellToday,
                selected && styles.cellSelected,
              ]}
            >
              <Text style={styles.cellDay}>{cell.dayOfMonth}</Text>
              <CalendarDayMarkers markers={cell.markers} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Pressable
          onPress={onToggleDisplayMode}
          disabled={!onToggleDisplayMode}
          accessibilityRole="button"
          hitSlop={6}
        >
          <Text style={styles.footerToggle}>{toggleLabel}</Text>
        </Pressable>
        <View style={styles.footerMonthRow}>
          {displayMode === 'month' ? (
            <Pressable onPress={() => shiftMonth(-1)} accessibilityLabel={copy.calPrev} hitSlop={8}>
              <Text style={styles.footerNav}>‹</Text>
            </Pressable>
          ) : null}
          <Text style={styles.footerMonth}>{monthLabel}</Text>
          {displayMode === 'month' ? (
            <Pressable onPress={() => shiftMonth(1)} accessibilityLabel={copy.calNext} hitSlop={8}>
              <Text style={styles.footerNav}>›</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function formatCalendarMonthYear(year: number, month: number, locale: string): string {
  const loc = locale.startsWith('ru') ? 'ru-RU' : locale;
  const name = new Intl.DateTimeFormat(loc, { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  const titled = name.charAt(0).toLocaleUpperCase(loc) + name.slice(1);
  return `${titled} ${year}`;
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    weekRow: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: c.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridWeek: { flexWrap: 'nowrap' },
    cell: {
      width: '14.28%',
      minHeight: 48,
      padding: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    cellMuted: { opacity: 0.45 },
    cellToday: { borderColor: c.primary },
    cellSelected: { borderColor: c.text, borderWidth: 2 },
    cellDay: { fontSize: 12, fontWeight: '600', color: c.text },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    footerToggle: { fontSize: 12, fontWeight: '600', color: c.primary },
    footerMonthRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    footerMonth: { fontSize: 12, color: c.textMuted },
    footerNav: { fontSize: 16, lineHeight: 18, color: c.textMuted, paddingHorizontal: 4 },
  });
}
