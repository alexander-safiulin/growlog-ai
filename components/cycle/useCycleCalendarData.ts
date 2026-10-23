'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
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
  type GrowCycleStage,
  type RawFeedingRow,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useCycleCalendarMonth(params: { year: number; month: number }) {
  const { supabase, farmId, cycle, farms } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const bounds = useMemo(
    () => monthUtcBoundsForFarmMonth(params.year, params.month, farmTz),
    [params.year, params.month, farmTz],
  );

  const stageQuery = useQuery({
    queryKey: ['cycle-cal-stage', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: async () => {
      const { fetchStageChangeEvents } = await import('@growlog/domain');
      return fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id });
    },
  });

  const dataQuery = useQuery({
    queryKey: ['cycle-cal-data', farmId, cycle?.id, bounds.fromIso, bounds.toIso],
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

  const grid = useMemo(() => {
    if (!cycle) return [];
    const stageEvents = stageQuery.data ?? [];
    const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
    const initialStage =
      (stageEvents[0]?.payload?.from_stage as string | undefined) ??
      initialStageForMaterial(material);
    const transitions = stageEvents.map((e) => ({
      toStage: (e.payload.to_stage as GrowCycleStage) ?? cycle.stage,
      occurredAt: e.occurred_at,
    }));
    const timeline = buildStageTimeline({
      cycleStartDate: cycle.start_date,
      initialStage: initialStage as GrowCycleStage,
      transitions,
      timeZone: farmTz,
    });

    const markers = aggregateCycleDayMarkers({
      events: dataQuery.data?.events ?? [],
      feedingRows: (dataQuery.data?.feedingRows ?? []) as RawFeedingRow[],
      timeZone: farmTz,
    });

    let cycleEndDate: string | null = null;
    if (cycle.stage === 'completed' || cycle.status === 'harvested') {
      const lastStage = stageEvents[stageEvents.length - 1];
      cycleEndDate = lastStage
        ? farmDateFromIso(lastStage.occurred_at, farmTz)
        : farmCalendarDateString(farmTz);
    }

    return buildCalendarMonthGrid({
      year: params.year,
      month: params.month,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
      cycleEndDate,
      stageTimeline: timeline,
      dayMarkers: markers,
    });
  }, [cycle, dataQuery.data, farmTz, params.month, params.year, stageQuery.data]);

  return {
    farmTz,
    grid,
    events: dataQuery.data?.events ?? [],
    feedingRows: dataQuery.data?.feedingRows ?? [],
    isLoading: dataQuery.isLoading || stageQuery.isLoading,
  };
}
