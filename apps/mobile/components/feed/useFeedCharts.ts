import { useFarmContext } from '@/providers/FarmProvider';
import {
  activityByFarmDay,
  chartPeriodBounds,
  clipStageSpans,
  climateToLineSeries,
  dailyStatsToBandSeries,
  farmCalendarDateString,
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
  const { supabase, farmId, cycle, primaryScope, isLocalWorkspace, localWorkspace, displayFarmTimezone } =
    useFarmContext();
  const farmTz = displayFarmTimezone || 'UTC';
  const today = farmCalendarDateString(farmTz);

  const scopeId = primaryScope?.id ?? null;
  const cycleReady = Boolean(farmId && cycle?.id);

  const bounds = useMemo(() => {
    if (!cycle) return null;
    return chartPeriodBounds({
      period,
      today,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
    });
  }, [period, today, farmTz, cycle]);

  const cycleBounds = useMemo(() => {
    if (!cycle) return null;
    return chartPeriodBounds({
      period: 'cycle',
      today,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
    });
  }, [today, farmTz, cycle]);

  const climateQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'climate', farmId, cycle?.id, scopeId, period, bounds?.fromDate, bounds?.toDate],
    enabled: cycleReady && Boolean(scopeId) && bounds != null && !isLocalWorkspace,
    refetchInterval: period === '24h' ? 60_000 : false,
    queryFn: async () => {
      if (!farmId || !cycle?.id || !scopeId) return { readings: [], daily: [] };
      const window =
        period === '24h'
          ? chartPeriodBounds({
              period,
              today,
              timeZone: farmTz,
              cycleStartDate: cycle.start_date,
              now: new Date(),
            })
          : bounds;
      if (!window) return { readings: [], daily: [] };
      if (window.useDailyStats) {
        const daily = await fetchCycleEnvironmentalDailyStats(supabase, {
          farmId,
          cycleId: cycle.id,
          scopeId,
          fromDate: window.fromDate,
          toDate: window.toDate,
        });
        return { readings: [], daily };
      }
      const readings = await fetchCycleClimateReadings(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        fromIso: window.fromIso,
        toIso: window.toIso,
      });
      return { readings, daily: [] };
    },
  });

  const feedingQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'feeding', farmId, cycle?.id, bounds?.fromIso],
    enabled: cycleReady && bounds != null,
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
    queryKey: [FEED_CHARTS_KEY, 'activity', farmId, cycle?.id, cycleBounds?.fromIso],
    enabled: cycleReady && cycleBounds != null,
    queryFn: async () => {
      if (!cycleBounds || !farmId || !cycle?.id) return [];
      if (isLocalWorkspace && localWorkspace) {
        return localJournalToEventRows(localWorkspace)
          .filter((e) => e.occurred_at >= cycleBounds.fromIso && e.occurred_at < cycleBounds.toIso)
          .map((e) => e.occurred_at);
      }
      const rows = await fetchCycleEventActivity(supabase, {
        farmId,
        cycleId: cycle.id,
        fromIso: cycleBounds.fromIso,
        toIso: cycleBounds.toIso,
      });
      return rows.map((r) => r.occurred_at);
    },
  });

  const stagesQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'stages', farmId, cycle?.id],
    enabled: cycleReady && !isLocalWorkspace,
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

    const finite = (points: Array<{ x: number; y: number }>) =>
      points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    const tempLine = finite(
      useDaily
        ? tempDaily.map((d) => ({ x: dateToX(d.date, origin), y: d.avg }))
        : climateToLineSeries(split.temp_air).map((p) => ({
            x: new Date(p.x).getTime(),
            y: p.y,
          })),
    );
    const rhLine = finite(
      useDaily
        ? rhDaily.map((d) => ({ x: dateToX(d.date, origin), y: d.avg }))
        : climateToLineSeries(split.rh).map((p) => ({
            x: new Date(p.x).getTime(),
            y: p.y,
          })),
    );
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
    const vpdPoints = finite(
      vpd.map((p) => ({
        x: useDaily ? dateToX(p.x, origin) : new Date(p.x).getTime(),
        y: p.vpdKpa,
      })),
    );

    const hasClimate = tempLine.length + rhLine.length > 0;

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

  const activity = useMemo(() => {
    if (!cycle || !cycleBounds) return { cells: [], truncated: false };
    return activityByFarmDay({
      occurredAts: activityQuery.isError ? [] : (activityQuery.data ?? []),
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
      today,
    });
  }, [activityQuery.data, activityQuery.isError, cycle, cycleBounds, farmTz, today]);

  const stageSpans: StageSpan[] = useMemo(() => {
    if (!cycle || (!isLocalWorkspace && !stagesQuery.isSuccess)) return [];
    const material = (cycle.start_material as 'seed' | 'clone' | null) ?? 'seed';
    const spans = stageSpansForCycle({
      cycleStartDate: cycle.start_date,
      initialStage: initialStageForMaterial(material),
      stageChanges: isLocalWorkspace ? [] : (stagesQuery.data ?? []),
      timeZone: farmTz,
      today,
    });
    const first = activity.cells[0]?.date;
    const last = activity.cells[activity.cells.length - 1]?.date;
    if (!first || !last) return spans;
    return clipStageSpans(spans, first, last);
  }, [cycle, stagesQuery.data, stagesQuery.isSuccess, farmTz, today, isLocalWorkspace, activity.cells]);

  return {
    bounds,
    climateError: climateQuery.isError,
    feedingError: feedingQuery.isError,
    activityError: activityQuery.isError,
    climateLoading: climateQuery.isLoading,
    feedingLoading: feedingQuery.isLoading,
    activityLoading: activityQuery.isLoading,
    scopeReady: Boolean(scopeId),
    climate: climateModel,
    phEc,
    activityCells: activity.cells,
    activityTruncated: activity.truncated,
    stageSpans,
    cycleStart: cycle?.start_date ?? '',
  };
}
