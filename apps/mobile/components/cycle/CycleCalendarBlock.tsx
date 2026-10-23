import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  aggregateCycleDayMarkers,
  buildCalendarMonthGrid,
  buildStageTimeline,
  farmCalendarDateString,
  farmDateFromIso,
  fetchCycleCalendarEvents,
  fetchCycleFeedingRowsForRange,
  initialStageForMaterial,
  monthUtcBoundsForFarmMonth,
  stageBandStyle,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const WEEK_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function CycleCalendarBlock({
  onSelectDate,
  selectedDate,
}: {
  selectedDate?: string | null;
  onSelectDate: (date: string) => void;
}) {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { supabase, farmId, cycle, farms } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const today = farmCalendarDateString(farmTz);
  const [y, m] = today.split('-').map(Number);
  const [ym, setYm] = useState({ year: y, month: m });

  const bounds = useMemo(
    () => monthUtcBoundsForFarmMonth(ym.year, ym.month, farmTz),
    [ym.year, ym.month, farmTz],
  );

  const stageQuery = useQuery({
    queryKey: ['m-cycle-cal-stage', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: async () => {
      const { fetchStageChangeEvents } = await import('@growlog/domain');
      return fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id });
    },
  });

  const dataQuery = useQuery({
    queryKey: ['m-cycle-cal', farmId, cycle?.id, bounds.fromIso],
    enabled: !!farmId && !!cycle?.id,
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

  const cells = useMemo(() => {
    if (!cycle) return [];
    const stageEvents = stageQuery.data ?? [];
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
    const markers = aggregateCycleDayMarkers({
      events: dataQuery.data?.events ?? [],
      feedingRows: dataQuery.data?.feedingRows ?? [],
      timeZone: farmTz,
    });
    let cycleEndDate: string | null = null;
    if (cycle.stage === 'completed' || cycle.status === 'harvested') {
      const last = stageEvents[stageEvents.length - 1];
      cycleEndDate = last ? farmDateFromIso(last.occurred_at, farmTz) : today;
    }
    return buildCalendarMonthGrid({
      year: ym.year,
      month: ym.month,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
      cycleEndDate,
      stageTimeline: timeline,
      dayMarkers: markers,
    });
  }, [cycle, dataQuery.data, farmTz, stageQuery.data, today, ym.month, ym.year]);

  if (!cycle) return null;

  function shiftMonth(delta: number) {
    let { year, month } = ym;
    month += delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    setYm({ year, month });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} accessibilityLabel={copy.calPrev}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{ym.month}.{ym.year}</Text>
        <Pressable onPress={() => shiftMonth(1)} accessibilityLabel={copy.calNext}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEK_KEYS.map((k) => (
          <Text key={k} style={styles.weekday}>{copy.calWeekday[k]}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          const tint = stageBandStyle(cell.stage, cell.inCycle ? 0.18 : 0.06);
          const selected = selectedDate === cell.date;
          return (
            <Pressable
              key={cell.date}
              onPress={() => onSelectDate(cell.date)}
              style={[
                styles.cell,
                { backgroundColor: tint ?? (cell.isCurrentMonth ? '#fafafa' : '#f3f3f3') },
                cell.muted && styles.cellMuted,
                cell.isToday && styles.cellToday,
                selected && styles.cellSelected,
              ]}
            >
              <Text style={styles.cellDay}>{cell.dayOfMonth}</Text>
              <Text style={styles.markers}>
                {cell.markers.watering ? '💧' : ''}
                {cell.markers.feedingColors?.length ? '🧪' : ''}
                {cell.markers.stageChange ? '🌿' : ''}
                {cell.markers.note ? '📝' : ''}
                {cell.markers.photo ? '📷' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nav: { fontSize: 22, paddingHorizontal: 12, color: '#2d6a4f' },
  month: { fontSize: 15, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: '#666' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    minHeight: 48,
    padding: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cellMuted: { opacity: 0.45 },
  cellToday: { borderColor: '#2d6a4f' },
  cellSelected: { borderColor: '#1b4332', borderWidth: 2 },
  cellDay: { fontSize: 12, fontWeight: '600' },
  markers: { fontSize: 9 },
});
