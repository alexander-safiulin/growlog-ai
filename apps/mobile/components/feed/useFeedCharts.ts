import { useFarmContext } from '@/providers/FarmProvider';
import {
  activityByFarmDay,
  chartPeriodBounds,
  clipStageSpans,
  climateToLineSeries,
  dailyStatsToBandSeries,
  earliestCycleStart,
  farmCalendarDateString,
  feedingPhEcSeries,
  fetchCycleClimateReadings,
  fetchCycleEnvironmentalDailyStats,
  fetchCycleEventActivity,
  fetchCycleFeedingRowsForRange,
  fetchGrowCyclesForFarm,
  fetchStageChangeEvents,
  initialStageForMaterial,
  localJournalFeedingRows,
  localJournalToEventRows,
  pairVpdFromDailyStats,
  pairVpdFromReadings,
  previousCycleSpan,
  previousCycleWindow,
  splitClimateReadingsByMetric,
  stageSpansForCycle,
  type FeedChartPeriod,
  type RawFeedingRow,
  type StageSpan,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const FEED_CHARTS_KEY = 'feed-charts';

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
  const spansFarms = period === 'previous' || period === 'all';

  const cyclesQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'cycles', farmId],
    enabled: cycleReady && !isLocalWorkspace && spansFarms,
    queryFn: () => fetchGrowCyclesForFarm(supabase, farmId!),
  });

  const historySpan = useMemo(() => {
    if (!cycle || !spansFarms) return null;
    const cycles = cyclesQuery.data ?? [];
    if (period === 'previous') {
      const previous = previousCycleSpan(cycles, cycle.id);
      if (!previous) return null;
      const window = previousCycleWindow(previous, cycle.start_date, today);
      return window ? { ...window, cycleId: previous.id } : null;
    }
    return {
      fromDate: earliestCycleStart(cycles, cycle.start_date),
      toDate: today,
      cycleId: null as string | null,
    };
  }, [cycle, spansFarms, period, cyclesQuery.data, today]);

  const bounds = useMemo(() => {
    if (!cycle) return null;
    if (period === 'previous' && !historySpan) return null;
    return chartPeriodBounds({
      period,
      today,
      timeZone: farmTz,
      cycleStartDate: cycle.start_date,
      spanStart: historySpan?.fromDate,
      spanEnd: historySpan?.toDate,
    });
  }, [period, today, farmTz, cycle, historySpan]);

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
    queryKey: [
      FEED_CHARTS_KEY,
      'climate',
      farmId,
      cycle?.id,
      historySpan?.cycleId,
      scopeId,
      period,
      bounds?.fromDate,
      bounds?.toDate,
    ],
    enabled:
      cycleReady &&
      bounds != null &&
      !isLocalWorkspace &&
      (spansFarms || Boolean(scopeId)) &&
      (period !== 'previous' || historySpan != null),
    refetchInterval: period === '24h' || period === '48h' ? 60_000 : false,
    queryFn: async () => {
      if (!farmId || !cycle?.id) return { readings: [], daily: [] };
      const window =
        period === '24h' || period === '48h'
          ? chartPeriodBounds({
              period,
              today,
              timeZone: farmTz,
              cycleStartDate: cycle.start_date,
              now: new Date(),
            })
          : bounds;
      if (!window) return { readings: [], daily: [] };
      const targetCycleId = period === 'all' ? null : period === 'previous' ? historySpan?.cycleId : cycle.id;
      const targetScopeId = spansFarms ? null : scopeId;
      if (window.useDailyStats) {
        const daily = await fetchCycleEnvironmentalDailyStats(supabase, {
          farmId,
          cycleId: targetCycleId,
          scopeId: targetScopeId,
          fromDate: window.fromDate,
          toDate: window.toDate,
        });
        return { readings: [], daily };
      }
      const readings = await fetchCycleClimateReadings(supabase, {
        farmId,
        cycleId: targetCycleId,
        scopeId: targetScopeId,
        fromIso: window.fromIso,
        toIso: window.toIso,
      });
      return { readings, daily: [] };
    },
  });

  const feedingQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'feeding', farmId, cycle?.id, historySpan?.cycleId, bounds?.fromIso, period],
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
        cycleId: period === 'all' ? null : period === 'previous' ? historySpan?.cycleId : cycle.id,
        fromIso: bounds.fromIso,
        toIso: bounds.toIso,
      });
    },
  });

  const activityWindow = spansFarms ? bounds : cycleBounds;

  const activityQuery = useQuery({
    queryKey: [FEED_CHARTS_KEY, 'activity', farmId, cycle?.id, historySpan?.cycleId, activityWindow?.fromIso, period],
    enabled: cycleReady && activityWindow != null,
    queryFn: async () => {
      if (!activityWindow || !farmId || !cycle?.id) return [];
      if (isLocalWorkspace && localWorkspace) {
        return localJournalToEventRows(localWorkspace)
          .filter((e) => e.occurred_at >= activityWindow.fromIso && e.occurred_at < activityWindow.toIso)
          .map((e) => e.occurred_at);
      }
      const rows = await fetchCycleEventActivity(supabase, {
        farmId,
        cycleId: period === 'all' ? null : period === 'previous' ? historySpan?.cycleId : cycle.id,
        fromIso: activityWindow.fromIso,
        toIso: activityWindow.toIso,
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
    if (!cycle || !activityWindow) return { cells: [], truncated: false };
    return activityByFarmDay({
      occurredAts: activityQuery.isError ? [] : (activityQuery.data ?? []),
      timeZone: farmTz,
      cycleStartDate: spansFarms ? activityWindow.fromDate : cycle.start_date,
      today: spansFarms ? activityWindow.toDate : today,
    });
  }, [activityQuery.data, activityQuery.isError, cycle, activityWindow, farmTz, today, spansFarms]);

  const stageSpans: StageSpan[] = useMemo(() => {
    if (spansFarms) return [];
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
  }, [cycle, stagesQuery.data, stagesQuery.isSuccess, farmTz, today, isLocalWorkspace, activity.cells, spansFarms]);

  return {
    bounds,
    climateError: climateQuery.isError,
    feedingError: feedingQuery.isError,
    activityError: activityQuery.isError,
    missingPrevious:
      period === 'previous' && (isLocalWorkspace || (cyclesQuery.isSuccess && historySpan == null)),
    climateLoading: climateQuery.isLoading || (spansFarms && cyclesQuery.isLoading),
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
