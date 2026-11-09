import { useFeedEvents } from '@/components/feed/useFeedEvents';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  activityByFarmDay,
  chartPeriodBounds,
  climateToLineSeries,
  dailyStatsToBandSeries,
  feedingPhEcSeries,
  fetchCycleClimateReadings,
  fetchCycleEnvironmentalDailyStats,
  fetchCycleEventActivity,
  fetchCycleFeedingRowsForRange,
  fetchStageChangeEvents,
  initialStageForMaterial,
  localJournalFeedingRows,
  localJournalToEventRows,
  pairVpdFromDailyStats,
  pairVpdFromReadings,
  splitClimateReadingsByMetric,
  stageSpansForCycle,
  type FeedChartPeriod,
  type RawFeedingRow,
  type StageSpan,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const FEED_CHARTS_KEY = 'feed-charts';

function dateToX(date: string, origin: string): number {
  const [y0, m0, d0] = origin.split('-').map(Number);
  const [y1, m1, d1] = date.split('-').map(Number);
  const t0 = Date.UTC(y0, m0 - 1, d0);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  return Math.round((t1 - t0) / 86_400_000);
}

export function useFeedCharts(period: FeedChartPeriod) {
  const { supabase, farmId, cycle, primaryScope, isLocalWorkspace, localWorkspace } = useFarmContext();
  const { farmTz, today } = useFeedEvents();

  const scopeId = primaryScope?.id ?? null;
  const enabled = Boolean(farmId && cycle?.id && scopeId);

  const bounds = useMemo(() => {
    if (!cycle) return null;
    return chartPeriodBounds({
      period,
      today,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
    });
  }, [period, today, farmTz, cycle]);

  const climateQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'climate', farmId, cycle?.id, scopeId, period, bounds?.fromIso],
    enabled: enabled && bounds != null && !isLocalWorkspace,
    queryFn: async () => {
      if (!bounds || !farmId || !cycle?.id || !scopeId) return { readings: [], daily: [] };
      if (bounds.useDailyStats) {
        const daily = await fetchCycleEnvironmentalDailyStats(supabase, {
          farmId,
          cycleId: cycle.id,
          scopeId,
          fromDate: bounds.fromDate,
          toDate: bounds.toDate,
        });
        return { readings: [], daily };
      }
      const readings = await fetchCycleClimateReadings(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        fromIso: bounds.fromIso,
        toIso: bounds.toIso,
      });
      return { readings, daily: [] };
    },
  });

  const feedingQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'feeding', farmId, cycle?.id, bounds?.fromIso],
    enabled: enabled && bounds != null,
    queryFn: async (): Promise<RawFeedingRow[]> => {
      if (!bounds || !farmId || !cycle?.id) return [];
      if (isLocalWorkspace && localWorkspace) {
        return localJournalFeedingRows(localWorkspace).filter(
          (r) => r.occurred_at >= bounds.fromIso && r.occurred_at < bounds.toIso,
        );
      }
      return fetchCycleFeedingRowsForRange(supabase, {
        farmId,
        cycleId: cycle.id,
        fromIso: bounds.fromIso,
        toIso: bounds.toIso,
      });
    },
  });

  const activityQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'activity', farmId, cycle?.id, bounds?.fromIso],
    enabled: enabled && bounds != null,
    queryFn: async () => {
      if (!bounds || !farmId || !cycle?.id) return [];
      if (isLocalWorkspace && localWorkspace) {
        return localJournalToEventRows(localWorkspace)
          .filter((e) => e.occurred_at >= bounds.fromIso && e.occurred_at < bounds.toIso)
          .map((e) => e.occurred_at);
      }
      const rows = await fetchCycleEventActivity(supabase, {
        farmId,
        cycleId: cycle.id,
        fromIso: bounds.fromIso,
        toIso: bounds.toIso,
      });
      return rows.map((r) => r.occurred_at);
    },
  });

  const stagesQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'stages', farmId, cycle?.id],
    enabled: enabled && !isLocalWorkspace,
    queryFn: async () => {
      if (!farmId || !cycle?.id) return [];
      return fetchStageChangeEvents(supabase, { farmId, cycleId: cycle.id });
    },
  });

  const climateModel = useMemo(() => {
    const data = climateQuery.data;
    if (!data || !bounds) return null;
    const split = splitClimateReadingsByMetric(data.readings);
    const tempDaily = dailyStatsToBandSeries(data.daily, 'temp_air');
    const rhDaily = dailyStatsToBandSeries(data.daily, 'rh');
    const useDaily = bounds.useDailyStats;
    const origin = bounds.fromDate;

    const tempLine = useDaily
      ? tempDaily.map((d) => ({ x: dateToX(d.date, origin), y: d.avg }))
      : climateToLineSeries(split.temp_air).map((p) => ({
          x: new Date(p.x).getTime(),
          y: p.y,
        }));
    const rhLine = useDaily
      ? rhDaily.map((d) => ({ x: dateToX(d.date, origin), y: d.avg }))
      : climateToLineSeries(split.rh).map((p) => ({
          x: new Date(p.x).getTime(),
          y: p.y,
        }));
    const tempBands = useDaily
      ? tempDaily.map((d) => ({
          x: dateToX(d.date, origin),
          min: d.min,
          max: d.max,
        }))
      : [];
    const rhBands = useDaily
      ? rhDaily.map((d) => ({
          x: dateToX(d.date, origin),
          min: d.min,
          max: d.max,
        }))
      : [];

    const vpd = useDaily ? pairVpdFromDailyStats(data.daily) : pairVpdFromReadings(data.readings);
    const vpdPoints = vpd.map((p, i) => ({
      x: useDaily ? dateToX(p.x, origin) : new Date(p.x).getTime() || i,
      y: p.vpdKpa,
    }));

    const hasClimate =
      split.temp_air.length > 0 ||
      split.rh.length > 0 ||
      data.daily.some((d) => d.metricCode === 'temp_air' || d.metricCode === 'rh');

    return {
      tempLine,
      rhLine,
      tempBands,
      rhBands,
      vpdPoints,
      fromDailyAvg: useDaily,
      hasClimate,
    };
  }, [climateQuery.data, bounds]);

  const phEc = useMemo(() => feedingPhEcSeries(feedingQuery.data ?? []), [feedingQuery.data]);

  const activityCells = useMemo(() => {
    if (!cycle || !bounds) return [];
    return activityByFarmDay({
      occurredAts: activityQuery.data ?? [],
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
      today,
    });
  }, [activityQuery.data, cycle, bounds, farmTz, today]);

  const stageSpans: StageSpan[] = useMemo(() => {
    if (!cycle) return [];
    const material = (cycle.start_material as 'seed' | 'clone' | null) ?? 'seed';
    return stageSpansForCycle({
      cycleStartDate: cycle.start_date,
      initialStage: initialStageForMaterial(material),
      stageChanges: isLocalWorkspace ? [] : (stagesQuery.data ?? []),
      timeZone: farmTz,
      today,
    });
  }, [cycle, stagesQuery.data, farmTz, today, isLocalWorkspace]);

  const loading = climateQuery.isLoading || feedingQuery.isLoading || activityQuery.isLoading;

  return {
    bounds,
    loading,
    scopeReady: Boolean(scopeId),
    climate: climateModel,
    phEc,
    activityCells,
    stageSpans,
    cycleStart: cycle?.start_date ?? '',
  };
}
