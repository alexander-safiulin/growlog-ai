import { farmDateFromIso, shiftCalendarDate } from './cycle-calendar';
import type { RawFeedingRow } from './cycle-calendar';
import {
  buildStageTimeline,
  instantForFarmCalendarDate,
  normalizeGrowCycleStage,
  type GrowCycleStage,
  type StageTransition,
} from './cycle-tracking';
import { computeVpdKpa } from './vpd';

export type FeedChartPeriod = '24h' | '7d' | '30d' | 'cycle';

export type ChartPeriodBounds = {
  fromIso: string;
  toIso: string;
  period: FeedChartPeriod;
  /** Use `environmental_daily_stats` instead of raw readings. */
  useDailyStats: boolean;
  /** Inclusive farm calendar dates for daily charts. */
  fromDate: string;
  toDate: string;
};

export type ClimateMetricCode = 'temp_air' | 'rh';

export type ClimateReadingPoint = {
  capturedAt: string;
  metricCode: ClimateMetricCode;
  value: number;
  unit: string | null;
};

export type ClimateDailyStatPoint = {
  statDate: string;
  metricCode: ClimateMetricCode;
  min: number;
  max: number;
  avg: number;
  readingCount: number;
};

export type NumericSeriesPoint = {
  x: string;
  y: number;
};

export type DailyBandPoint = {
  date: string;
  min: number;
  max: number;
  avg: number;
};

export type VpdSeriesPoint = {
  x: string;
  vpdKpa: number;
  fromDailyAvg?: boolean;
};

export type PhEcPoint = {
  occurredAt: string;
  ph: number | null;
  ecMs: number | null;
  entryKind: 'watering' | 'feeding';
};

export type ActivityDayCell = {
  date: string;
  count: number;
  cycleDay: number;
};

export type StageSpan = {
  stage: GrowCycleStage;
  fromDate: string;
  toDate: string;
};

const CLIMATE_CODES: ClimateMetricCode[] = ['temp_air', 'rh'];

export function chartPeriodBounds(params: {
  period: FeedChartPeriod;
  today: string;
  timeZone: string;
  cycleStartDate: string;
  now?: Date;
}): ChartPeriodBounds {
  const now = params.now ?? new Date();
  const { period, today, timeZone, cycleStartDate } = params;

  if (period === '24h') {
    const fromIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const toIso = now.toISOString();
    return {
      fromIso,
      toIso,
      period,
      useDailyStats: false,
      fromDate: farmDateFromIso(fromIso, timeZone),
      toDate: today,
    };
  }

  const windowDays = period === '7d' ? 6 : period === '30d' ? 29 : null;
  const fromDate =
    windowDays != null ? shiftCalendarDate(today, -windowDays) : cycleStartDate;
  const clampedFrom = fromDate < cycleStartDate ? cycleStartDate : fromDate;
  const fromIso = instantForFarmCalendarDate(clampedFrom, timeZone);
  const toIso = instantForFarmCalendarDate(shiftCalendarDate(today, 1), timeZone);

  return {
    fromIso,
    toIso,
    period,
    useDailyStats: true,
    fromDate: clampedFrom,
    toDate: today,
  };
}

export function splitClimateReadingsByMetric(
  readings: ClimateReadingPoint[],
): Record<ClimateMetricCode, ClimateReadingPoint[]> {
  const out: Record<ClimateMetricCode, ClimateReadingPoint[]> = {
    temp_air: [],
    rh: [],
  };
  for (const row of readings) {
    if (CLIMATE_CODES.includes(row.metricCode)) {
      out[row.metricCode].push(row);
    }
  }
  for (const code of CLIMATE_CODES) {
    out[code].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }
  return out;
}

export function climateToLineSeries(
  points: ClimateReadingPoint[],
): NumericSeriesPoint[] {
  return points.map((p) => ({ x: p.capturedAt, y: p.value }));
}

export function dailyStatsToBandSeries(
  stats: ClimateDailyStatPoint[],
  metricCode: ClimateMetricCode,
): DailyBandPoint[] {
  return stats
    .filter((s) => s.metricCode === metricCode)
    .sort((a, b) => a.statDate.localeCompare(b.statDate))
    .map((s) => ({
      date: s.statDate,
      min: s.min,
      max: s.max,
      avg: s.avg,
    }));
}

/** Pair temp + RH readings at the same `captured_at` (±1s tolerance). */
export function pairVpdFromReadings(
  readings: ClimateReadingPoint[],
): VpdSeriesPoint[] {
  const byTime = new Map<string, Partial<Record<ClimateMetricCode, number>>>();
  for (const r of readings) {
    const key = r.capturedAt.slice(0, 19);
    const bucket = byTime.get(key) ?? {};
    bucket[r.metricCode] = r.value;
    byTime.set(key, bucket);
  }
  const out: VpdSeriesPoint[] = [];
  for (const [x, bucket] of [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const air = bucket.temp_air;
    const rh = bucket.rh;
    if (air == null || rh == null) continue;
    const vpdKpa = computeVpdKpa({ airTempC: air, rhPct: rh });
    if (vpdKpa == null) continue;
    out.push({ x: `${x}Z`, vpdKpa, fromDailyAvg: false });
  }
  return out;
}

export function pairVpdFromDailyStats(stats: ClimateDailyStatPoint[]): VpdSeriesPoint[] {
  const temps = new Map(stats.filter((s) => s.metricCode === 'temp_air').map((s) => [s.statDate, s]));
  const rhs = new Map(stats.filter((s) => s.metricCode === 'rh').map((s) => [s.statDate, s]));
  const dates = [...new Set([...temps.keys(), ...rhs.keys()])].sort();
  const out: VpdSeriesPoint[] = [];
  for (const date of dates) {
    const t = temps.get(date);
    const h = rhs.get(date);
    if (!t || !h) continue;
    const vpdKpa = computeVpdKpa({ airTempC: t.avg, rhPct: h.avg });
    if (vpdKpa == null) continue;
    out.push({ x: date, vpdKpa, fromDailyAvg: true });
  }
  return out;
}

export function feedingPhEcSeries(rows: RawFeedingRow[]): PhEcPoint[] {
  return [...rows]
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    .map((r) => ({
      occurredAt: r.occurred_at,
      ph: r.ph,
      ecMs: r.ec_ms,
      entryKind: r.entry_kind,
    }));
}

export function activityByFarmDay(params: {
  occurredAts: string[];
  timeZone: string;
  cycleStartDate: string;
  today: string;
}): ActivityDayCell[] {
  const counts = new Map<string, number>();
  for (const iso of params.occurredAts) {
    const day = farmDateFromIso(iso, params.timeZone);
    if (day < params.cycleStartDate || day > params.today) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const cells: ActivityDayCell[] = [];
  let cursor = params.cycleStartDate;
  while (cursor <= params.today) {
    const cycleDay =
      Math.floor(
        (new Date(instantForFarmCalendarDate(cursor, params.timeZone)).getTime() -
          new Date(instantForFarmCalendarDate(params.cycleStartDate, params.timeZone)).getTime()) /
          86_400_000,
      ) + 1;
    cells.push({
      date: cursor,
      count: counts.get(cursor) ?? 0,
      cycleDay: Math.max(1, cycleDay),
    });
    cursor = shiftCalendarDate(cursor, 1);
  }
  return cells;
}

export function stageSpansForCycle(params: {
  cycleStartDate: string;
  initialStage: GrowCycleStage;
  stageChanges: Array<{ occurred_at: string; payload: Record<string, unknown> | null }>;
  timeZone: string;
  today: string;
}): StageSpan[] {
  const transitions = params.stageChanges
    .map((e) => ({
      toStage: normalizeGrowCycleStage(String(e.payload?.to_stage ?? '')),
      occurredAt: e.occurred_at,
    }))
    .filter((t) => t.toStage);
  const timeline: StageTransition[] = buildStageTimeline({
    cycleStartDate: params.cycleStartDate,
    initialStage: params.initialStage,
    transitions,
    timeZone: params.timeZone,
  });

  const spans: StageSpan[] = [];
  for (let i = 0; i < timeline.length; i++) {
    const cur = timeline[i];
    const next = timeline[i + 1];
    const fromDate = farmDateFromIso(cur.startedAt, params.timeZone);
    const toDate = next
      ? shiftCalendarDate(farmDateFromIso(next.startedAt, params.timeZone), -1)
      : params.today;
    if (fromDate > params.today) continue;
    spans.push({
      stage: cur.stage,
      fromDate,
      toDate: toDate > params.today ? params.today : toDate,
    });
  }
  return spans;
}

export function seriesMinMax(values: number[]): { min: number; max: number } | null {
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}
