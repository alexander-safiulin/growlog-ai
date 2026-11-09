import { farmDateFromIso, shiftCalendarDate } from './cycle-calendar';
import type { RawFeedingRow } from './cycle-calendar';
import {
  GROWER_STAGE_ORDER,
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
const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** Heatmap stays usable if a cycle start date is years in the past. */
export const ACTIVITY_HEATMAP_CAP = 400;
const TEMP_MIN_C = -40;
const TEMP_MAX_C = 80;
const PH_MIN = 0;
const PH_MAX = 14;
const EC_MIN = 0;
const EC_MAX = 20;

function isYmd(value: string): boolean {
  return YMD.test(value);
}

function calendarDaysBetween(from: string, to: string): number {
  const [y0, m0, d0] = from.split('-').map(Number);
  const [y1, m1, d1] = to.split('-').map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y0, m0 - 1, d0)) / 86_400_000);
}

function dayStartIso(date: string, timeZone: string): string {
  try {
    return instantForFarmCalendarDate(date, timeZone);
  } catch {
    return `${date}T00:00:00.000Z`;
  }
}

function calendarDay(iso: string, timeZone: string): string | null {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  try {
    const day = farmDateFromIso(iso, timeZone);
    return isYmd(day) ? day : null;
  } catch {
    const fallback = new Date(ms).toISOString().slice(0, 10);
    return isYmd(fallback) ? fallback : null;
  }
}

function usableClimateValue(code: ClimateMetricCode, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (code === 'temp_air') return value >= TEMP_MIN_C && value <= TEMP_MAX_C;
  return value >= 0 && value <= 100;
}

function finiteOrNull(value: number | null, min: number, max: number): number | null {
  if (value == null || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function chartPeriodBounds(params: {
  period: FeedChartPeriod;
  today: string;
  timeZone: string;
  cycleStartDate: string;
  now?: Date;
}): ChartPeriodBounds {
  const now = params.now ?? new Date();
  const { period, today, timeZone, cycleStartDate } = params;

  const todayDate = isYmd(today) ? today : new Date().toISOString().slice(0, 10);
  const cycleStart = isYmd(cycleStartDate) ? cycleStartDate : todayDate;

  if (period === '24h') {
    const fromInstant = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cycleStartMs = new Date(dayStartIso(cycleStart, timeZone)).getTime();
    const fromMs = Math.max(fromInstant.getTime(), Number.isFinite(cycleStartMs) ? cycleStartMs : fromInstant.getTime());
    const fromIso = new Date(fromMs).toISOString();
    const toIso = now.toISOString();
    return {
      fromIso: fromIso < toIso ? fromIso : toIso,
      toIso,
      period,
      useDailyStats: false,
      fromDate: calendarDay(fromIso, timeZone) ?? todayDate,
      toDate: todayDate,
    };
  }

  const windowDays = period === '7d' ? 6 : period === '30d' ? 29 : null;
  const fromDate =
    windowDays != null ? shiftCalendarDate(todayDate, -windowDays) : cycleStart;
  let clampedFrom = fromDate < cycleStart ? cycleStart : fromDate;
  if (clampedFrom > todayDate) clampedFrom = todayDate;
  const fromIso = dayStartIso(clampedFrom, timeZone);
  const toIso = dayStartIso(shiftCalendarDate(todayDate, 1), timeZone);

  return {
    fromIso,
    toIso,
    period,
    useDailyStats: true,
    fromDate: clampedFrom,
    toDate: todayDate,
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
    if (CLIMATE_CODES.includes(row.metricCode) && usableClimateValue(row.metricCode, row.value)) {
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
    .filter((s) => s.metricCode === metricCode && isYmd(s.statDate.slice(0, 10)))
    .filter((s) => [s.min, s.max, s.avg].every((n) => Number.isFinite(n)))
    .filter(
      (s) =>
        usableClimateValue(metricCode, s.min) &&
        usableClimateValue(metricCode, s.max) &&
        usableClimateValue(metricCode, s.avg),
    )
    .sort((a, b) => a.statDate.localeCompare(b.statDate))
    .map((s) => {
      const min = Math.min(s.min, s.max);
      const max = Math.max(s.min, s.max);
      return {
        date: s.statDate.slice(0, 10),
        min,
        max,
        avg: s.avg,
      };
    });
}

const KNOWN_STAGES = new Set<string>(GROWER_STAGE_ORDER);

/** Pair temp + RH written in the same UTC second (worker uses one timestamp). */
export function pairVpdFromReadings(
  readings: ClimateReadingPoint[],
): VpdSeriesPoint[] {
  const bySecond = new Map<number, Partial<Record<ClimateMetricCode, number>>>();
  for (const r of readings) {
    const ms = new Date(r.capturedAt).getTime();
    if (!Number.isFinite(ms)) continue;
    const second = Math.floor(ms / 1000);
    const bucket = bySecond.get(second) ?? {};
    bucket[r.metricCode] = r.value;
    bySecond.set(second, bucket);
  }
  const out: VpdSeriesPoint[] = [];
  for (const [second, bucket] of [...bySecond.entries()].sort(([a], [b]) => a - b)) {
    const air = bucket.temp_air;
    const rh = bucket.rh;
    if (air == null || rh == null) continue;
    const vpdKpa = computeVpdKpa({ airTempC: air, rhPct: rh });
    if (vpdKpa == null) continue;
    out.push({ x: new Date(second * 1000).toISOString(), vpdKpa, fromDailyAvg: false });
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
    if (!usableClimateValue('temp_air', t.avg) || !usableClimateValue('rh', h.avg)) continue;
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
      ph: finiteOrNull(r.ph, PH_MIN, PH_MAX),
      ecMs: finiteOrNull(r.ec_ms, EC_MIN, EC_MAX),
      entryKind: r.entry_kind,
    }));
}

export function activityByFarmDay(params: {
  occurredAts: string[];
  timeZone: string;
  cycleStartDate: string;
  today: string;
}): { cells: ActivityDayCell[]; truncated: boolean } {
  const today = isYmd(params.today) ? params.today : '';
  const cycleStart = isYmd(params.cycleStartDate) ? params.cycleStartDate : '';
  if (!today || !cycleStart || cycleStart > today) return { cells: [], truncated: false };

  const counts = new Map<string, number>();
  for (const iso of params.occurredAts) {
    const day = calendarDay(iso, params.timeZone);
    if (!day || day < cycleStart || day > today) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  let windowStart = today;
  for (let i = 0; i < ACTIVITY_HEATMAP_CAP - 1; i++) {
    if (windowStart <= cycleStart) break;
    const prev = shiftCalendarDate(windowStart, -1);
    if (prev === windowStart) break;
    windowStart = prev;
  }
  if (windowStart < cycleStart) windowStart = cycleStart;
  const truncated = windowStart > cycleStart;

  const cells: ActivityDayCell[] = [];
  let cursor = windowStart;
  for (let i = 0; i < ACTIVITY_HEATMAP_CAP && cursor <= today; i++) {
    const cycleDay = calendarDaysBetween(cycleStart, cursor) + 1;
    cells.push({
      date: cursor,
      count: counts.get(cursor) ?? 0,
      cycleDay: Math.max(1, cycleDay),
    });
    const next = shiftCalendarDate(cursor, 1);
    if (next === cursor) break;
    cursor = next;
  }
  return { cells, truncated };
}

export function stageSpansForCycle(params: {
  cycleStartDate: string;
  initialStage: GrowCycleStage;
  stageChanges: Array<{ occurred_at: string; payload: Record<string, unknown> | null }>;
  timeZone: string;
  today: string;
}): StageSpan[] {
  if (!isYmd(params.cycleStartDate) || !isYmd(params.today)) return [];
  const transitions = params.stageChanges
    .map((e) => ({
      toStage: normalizeGrowCycleStage(String(e.payload?.to_stage ?? '')),
      occurredAt: e.occurred_at,
    }))
    .filter((t) => KNOWN_STAGES.has(t.toStage) && Number.isFinite(new Date(t.occurredAt).getTime()));
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
    const fromDate = calendarDay(cur.startedAt, params.timeZone);
    if (!fromDate) continue;
    const nextDay = next ? calendarDay(next.startedAt, params.timeZone) : null;
    const toDate = nextDay ? shiftCalendarDate(nextDay, -1) : params.today;
    if (fromDate > params.today) continue;
    const clampedTo = toDate > params.today ? params.today : toDate;
    spans.push({
      stage: cur.stage,
      fromDate,
      toDate: clampedTo < fromDate ? fromDate : clampedTo,
    });
  }
  return spans;
}

export function seriesMinMax(values: number[]): { min: number; max: number } | null {
  const finite = values.filter((n) => Number.isFinite(n));
  if (!finite.length) return null;
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

export function clipStageSpans(spans: StageSpan[], fromDate: string, toDate: string): StageSpan[] {
  if (!isYmd(fromDate) || !isYmd(toDate) || fromDate > toDate) return [];
  const clipped: StageSpan[] = [];
  for (const span of spans) {
    const from = span.fromDate < fromDate ? fromDate : span.fromDate;
    const to = span.toDate > toDate ? toDate : span.toDate;
    if (from > to) continue;
    clipped.push({ ...span, fromDate: from, toDate: to });
  }
  return clipped;
}
