import type { GrowCycleStage } from './cycle-tracking';
import {
  farmCalendarDateString,
  instantForFarmCalendarDate,
  type StageTransition,
} from './cycle-tracking';
import { productColorKey, productMarkerColor } from './cycle-stage-colors';

export type CycleDayMarker = {
  watering?: boolean;
  feedingColors?: string[];
  stageChange?: boolean;
  note?: boolean;
  photo?: boolean;
};

export type CalendarMonthCell = {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  inCycle: boolean;
  muted: boolean;
  stage: GrowCycleStage | null;
  markers: CycleDayMarker;
};

const NOTE_EVENT_TYPES = new Set(['note', 'observation', 'action_taken', 'conversation_turn']);

export function shiftCalendarDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function parseCalendarDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** Monday = 0 … Sunday = 6 in the given farm time zone. */
export function weekdayIndexMondayFirst(dateStr: string, timeZone: string): number {
  const probe = new Date(instantForFarmCalendarDate(dateStr, timeZone));
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(probe);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

export function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function monthGridStart(year: number, month: number, timeZone: string): string {
  const first = firstDayOfMonth(year, month);
  const offset = weekdayIndexMondayFirst(first, timeZone);
  return shiftCalendarDate(first, -offset);
}

export function farmDateFromIso(iso: string, timeZone: string): string {
  return farmCalendarDateString(timeZone, new Date(iso));
}

export function stageForCalendarDate(
  dateStr: string,
  timeline: StageTransition[],
  timeZone: string,
): GrowCycleStage | null {
  if (!timeline.length) return null;
  let stage: GrowCycleStage | null = timeline[0].stage;
  for (const row of timeline) {
    const rowDate = farmDateFromIso(row.startedAt, timeZone);
    if (rowDate <= dateStr) stage = row.stage;
  }
  return stage;
}

export function buildCalendarMonthGrid(params: {
  year: number;
  month: number;
  timeZone: string;
  today?: Date;
  cycleStartDate: string;
  cycleEndDate?: string | null;
  stageTimeline: StageTransition[];
  dayMarkers: Record<string, CycleDayMarker>;
}): CalendarMonthCell[] {
  const todayStr = farmCalendarDateString(params.timeZone, params.today ?? new Date());
  const gridStart = monthGridStart(params.year, params.month, params.timeZone);
  const cells: CalendarMonthCell[] = [];

  for (let i = 0; i < 42; i++) {
    const date = shiftCalendarDate(gridStart, i);
    const { month: cellMonth } = parseCalendarDateParts(date);
    const isCurrentMonth = cellMonth === params.month;
    const inCycle =
      date >= params.cycleStartDate &&
      (params.cycleEndDate == null || params.cycleEndDate === '' || date <= params.cycleEndDate);
    cells.push({
      date,
      dayOfMonth: parseCalendarDateParts(date).day,
      isCurrentMonth,
      isToday: date === todayStr,
      inCycle,
      muted: !inCycle,
      stage: inCycle ? stageForCalendarDate(date, params.stageTimeline, params.timeZone) : null,
      markers: params.dayMarkers[date] ?? {},
    });
  }
  return cells;
}

export type RawCalendarEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
  body?: string | null;
  payload?: Record<string, unknown> | null;
};

export type RawFeedingRow = {
  event_id: string;
  occurred_at: string;
  entry_kind: 'watering' | 'feeding';
  volume_ml: number;
  ph: number | null;
  ec_ms: number | null;
  air_temp_c: number | null;
  air_rh_pct: number | null;
  recipe_name: string | null;
  comment: string | null;
  doses: Array<{
    product_label: string;
    amount_ml: number;
    fertilizer_product_id: string | null;
    farm_fertilizer_product_id: string | null;
  }>;
};

function mergeMarker(base: CycleDayMarker, patch: Partial<CycleDayMarker>): CycleDayMarker {
  const feedingColors = [...(base.feedingColors ?? [])];
  if (patch.feedingColors) {
    for (const c of patch.feedingColors) {
      if (!feedingColors.includes(c)) feedingColors.push(c);
    }
  }
  return {
    watering: base.watering || patch.watering,
    stageChange: base.stageChange || patch.stageChange,
    note: base.note || patch.note,
    photo: base.photo || patch.photo,
    feedingColors: feedingColors.length ? feedingColors : undefined,
  };
}

export function aggregateCycleDayMarkers(params: {
  events: RawCalendarEvent[];
  feedingRows: RawFeedingRow[];
  timeZone: string;
}): Record<string, CycleDayMarker> {
  const out: Record<string, CycleDayMarker> = {};

  for (const row of params.feedingRows) {
    const day = farmDateFromIso(row.occurred_at, params.timeZone);
    const colors =
      row.entry_kind === 'feeding'
        ? row.doses.map((d) =>
            productMarkerColor(
              productColorKey({
                productLabel: d.product_label,
                fertilizerProductId: d.fertilizer_product_id,
                farmFertilizerProductId: d.farm_fertilizer_product_id,
              }),
            ),
          )
        : undefined;
    out[day] = mergeMarker(out[day] ?? {}, {
      watering: row.entry_kind === 'watering',
      feedingColors: colors,
    });
  }

  for (const ev of params.events) {
    const day = farmDateFromIso(ev.occurred_at, params.timeZone);
    if (ev.event_type === 'watering') {
      out[day] = mergeMarker(out[day] ?? {}, { watering: true });
    } else if (ev.event_type === 'feeding') {
      out[day] = mergeMarker(out[day] ?? {}, { feedingColors: [productMarkerColor('feeding')] });
    } else if (ev.event_type === 'stage_changed') {
      out[day] = mergeMarker(out[day] ?? {}, { stageChange: true });
    } else if (ev.event_type === 'photo_capture') {
      out[day] = mergeMarker(out[day] ?? {}, { photo: true });
    } else if (NOTE_EVENT_TYPES.has(ev.event_type)) {
      out[day] = mergeMarker(out[day] ?? {}, { note: true });
    }
  }

  return out;
}

export function monthUtcBoundsForFarmMonth(
  year: number,
  month: number,
  timeZone: string,
): { fromIso: string; toIso: string } {
  const startDate = firstDayOfMonth(year, month);
  const gridStart = monthGridStart(year, month, timeZone);
  const gridEnd = shiftCalendarDate(gridStart, 41);
  const fromIso = instantForFarmCalendarDate(gridStart, timeZone);
  const endNext = shiftCalendarDate(gridEnd, 1);
  const toIso = instantForFarmCalendarDate(endNext, timeZone);
  return { fromIso, toIso };
}
