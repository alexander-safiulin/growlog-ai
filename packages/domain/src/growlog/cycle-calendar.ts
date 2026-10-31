import type { EventRow } from '../types/database';
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
  /** Target stage when `stageChange` is set (for calendar icon). */
  stageChangeTo?: GrowCycleStage;
  procedure?: boolean;
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
    stageChangeTo: patch.stageChangeTo ?? base.stageChangeTo,
    procedure: base.procedure || patch.procedure,
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
        ? row.doses.length > 0
          ? row.doses.map((d) =>
              productMarkerColor(
                productColorKey({
                  productLabel: d.product_label,
                  fertilizerProductId: d.fertilizer_product_id,
                  farmFertilizerProductId: d.farm_fertilizer_product_id,
                }),
              ),
            )
          : [productMarkerColor('feeding')]
        : undefined;
    out[day] = mergeMarker(out[day] ?? {}, {
      watering: row.entry_kind === 'watering',
      feedingColors: colors,
    });
  }

  const structuredEventIds = new Set(params.feedingRows.map((r) => r.event_id));

  for (const ev of params.events) {
    const day = farmDateFromIso(ev.occurred_at, params.timeZone);
    if (ev.event_type === 'watering' && !structuredEventIds.has(ev.id)) {
      out[day] = mergeMarker(out[day] ?? {}, { watering: true });
    } else if (ev.event_type === 'feeding' && !structuredEventIds.has(ev.id)) {
      out[day] = mergeMarker(out[day] ?? {}, { feedingColors: [productMarkerColor('feeding')] });
    } else if (ev.event_type === 'stage_changed') {
      const toStage = ev.payload?.to_stage;
      out[day] = mergeMarker(out[day] ?? {}, {
        stageChange: true,
        ...(typeof toStage === 'string' && toStage.length > 0
          ? { stageChangeTo: toStage as GrowCycleStage }
          : {}),
      });
    } else if (ev.event_type === 'action_taken' && ev.payload?.procedure === true) {
      out[day] = mergeMarker(out[day] ?? {}, { procedure: true });
    } else if (ev.event_type === 'photo_capture') {
      out[day] = mergeMarker(out[day] ?? {}, { photo: true });
    } else if (NOTE_EVENT_TYPES.has(ev.event_type)) {
      out[day] = mergeMarker(out[day] ?? {}, { note: true });
    }
  }

  return out;
}

export type FeedDaySection = {
  date: string;
  events: EventRow[];
};

/** photo_capture rows linked to a parent journal event (e.g. procedure attachment). */
export function isAttachedPhotoCapture(event: Pick<EventRow, 'event_type' | 'payload'>): boolean {
  if (event.event_type !== 'photo_capture') return false;
  const parent = event.payload?.parent_event_id;
  if (parent == null) return false;
  return String(parent).length > 0;
}

/** Same text saved again while a request was still in flight. */
export const PROCEDURE_RESUBMIT_WINDOW_MS = 60 * 60 * 1000;

export type FeedEventMedia = {
  mediaAssetIds: string[];
  storagePaths: string[];
};

type FeedEventWithMedia = EventRow & FeedEventMedia;

function isProcedureEvent(event: Pick<EventRow, 'event_type' | 'payload'>): boolean {
  return event.event_type === 'action_taken' && event.payload?.procedure === true;
}

function procedureIdentityKey(event: Pick<EventRow, 'scope_id' | 'occurred_at' | 'body' | 'title'>): string {
  const text = (event.body ?? event.title ?? '').trim();
  return `${event.scope_id ?? ''}|${event.occurred_at}|${text}`;
}

function withinResubmitWindow(a: string, b: string): boolean {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) <= PROCEDURE_RESUBMIT_WINDOW_MS;
}

function hasClientRequestId(event: Pick<EventRow, 'payload'>): boolean {
  const id = event.payload?.client_request_id;
  return typeof id === 'string' && id.length > 0;
}

function pushEventMedia(target: FeedEventMedia, event: Pick<EventRow, 'payload'>) {
  const assetId = event.payload?.media_asset_id;
  const storagePath = event.payload?.storage_path;
  if (typeof assetId === 'string' && assetId && !target.mediaAssetIds.includes(assetId)) {
    target.mediaAssetIds.push(assetId);
  }
  if (typeof storagePath === 'string' && storagePath && !target.storagePaths.includes(storagePath)) {
    target.storagePaths.push(storagePath);
  }
}

/**
 * One procedure save is one feed card.
 * Retries of the same backdated entry, and the photo row created for its attachment,
 * collapse onto the first event. Standalone photos stay.
 */
export function presentFeedEvents(events: EventRow[]): FeedEventWithMedia[] {
  const attachedByParent = new Map<string, EventRow[]>();
  const topLevel: EventRow[] = [];
  for (const event of events) {
    if (isAttachedPhotoCapture(event)) {
      const parentId = String(event.payload.parent_event_id);
      const list = attachedByParent.get(parentId) ?? [];
      list.push(event);
      attachedByParent.set(parentId, list);
      continue;
    }
    topLevel.push(event);
  }

  const procedureGroups = new Map<string, EventRow[]>();
  for (const event of topLevel) {
    if (!isProcedureEvent(event)) continue;
    const key = procedureIdentityKey(event);
    const list = procedureGroups.get(key) ?? [];
    list.push(event);
    procedureGroups.set(key, list);
  }

  const dropped = new Set<string>();
  const canonicalOf = new Map<string, string>();
  for (const list of procedureGroups.values()) {
    const sorted = [...list].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    let anchor = sorted[0];
    if (!anchor) continue;
    canonicalOf.set(anchor.id, anchor.id);
    for (const extra of sorted.slice(1)) {
      const historicalDuplicate = !hasClientRequestId(anchor) && !hasClientRequestId(extra);
      if (historicalDuplicate || withinResubmitWindow(anchor.created_at, extra.created_at)) {
        dropped.add(extra.id);
        canonicalOf.set(extra.id, anchor.id);
      } else {
        anchor = extra;
        canonicalOf.set(extra.id, extra.id);
      }
    }
  }

  const foldedPhotos = new Map<string, EventRow[]>();
  for (const event of topLevel) {
    if (event.event_type !== 'photo_capture') continue;
    const group = procedureGroups.get(procedureIdentityKey(event));
    if (!group?.length) continue;
    const earliest = [...group].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
    const match =
      group.find((procedure) => withinResubmitWindow(procedure.created_at, event.created_at)) ??
      (hasClientRequestId(event) || !earliest ? undefined : earliest);
    if (!match) continue;
    const targetId = canonicalOf.get(match.id) ?? match.id;
    dropped.add(event.id);
    const list = foldedPhotos.get(targetId) ?? [];
    list.push(event);
    foldedPhotos.set(targetId, list);
  }

  return topLevel
    .filter((event) => !dropped.has(event.id))
    .map((event) => {
      const media: FeedEventMedia = { mediaAssetIds: [], storagePaths: [] };
      pushEventMedia(media, event);
      for (const photo of attachedByParent.get(event.id) ?? []) pushEventMedia(media, photo);
      for (const photo of foldedPhotos.get(event.id) ?? []) pushEventMedia(media, photo);
      for (const [parentId, photos] of attachedByParent) {
        if ((canonicalOf.get(parentId) ?? parentId) !== event.id || parentId === event.id) continue;
        for (const photo of photos) pushEventMedia(media, photo);
      }
      return { ...event, ...media };
    });
}

export function feedEventMedia(event: EventRow): FeedEventMedia {
  const extra = event as EventRow & Partial<FeedEventMedia>;
  if (extra.mediaAssetIds || extra.storagePaths) {
    return {
      mediaAssetIds: extra.mediaAssetIds ?? [],
      storagePaths: extra.storagePaths ?? [],
    };
  }
  const media: FeedEventMedia = { mediaAssetIds: [], storagePaths: [] };
  pushEventMedia(media, event);
  return media;
}

export function resolvedEventStoragePaths(
  event: EventRow,
  storagePathByAssetId: Record<string, string>,
): string[] {
  const media = feedEventMedia(event);
  const paths = [...media.storagePaths];
  for (const id of media.mediaAssetIds) {
    const path = storagePathByAssetId[id];
    if (path && !paths.includes(path)) paths.push(path);
  }
  return paths;
}

export function resolvedEventPhotoAttachments(
  event: EventRow,
  storagePathByAssetId: Record<string, string>,
): Array<{ assetId: string; storagePath: string }> {
  const paths = resolvedEventStoragePaths(event, storagePathByAssetId);
  const media = feedEventMedia(event);
  const out: Array<{ assetId: string; storagePath: string }> = [];
  for (const path of paths) {
    let assetId =
      media.mediaAssetIds.find((id) => storagePathByAssetId[id] === path) ??
      Object.entries(storagePathByAssetId).find(([, p]) => p === path)?.[0] ??
      '';
    if (assetId) out.push({ assetId, storagePath: path });
  }
  return out;
}

export function shiftFarmMonth(year: number, month: number, deltaMonths: number): { year: number; month: number } {
  let m = month + deltaMonths;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

/** Newest `occurred_at` first; ties broken by newest `created_at` (order added). */
export function compareFeedEventsWithinDay(a: EventRow, b: EventRow): number {
  if (a.occurred_at !== b.occurred_at) {
    return a.occurred_at < b.occurred_at ? 1 : -1;
  }
  const aCreated = a.created_at ?? a.occurred_at;
  const bCreated = b.created_at ?? b.occurred_at;
  if (aCreated !== bCreated) {
    return aCreated < bCreated ? 1 : -1;
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** Groups events by farm calendar day; days newest-first, events within day newest-first. */
export function groupEventsByFarmDay(events: EventRow[], timeZone: string): FeedDaySection[] {
  const byDay = new Map<string, EventRow[]>();
  for (const ev of events) {
    const day = farmDateFromIso(ev.occurred_at, timeZone);
    const list = byDay.get(day) ?? [];
    list.push(ev);
    byDay.set(day, list);
  }
  for (const list of byDay.values()) {
    list.sort(compareFeedEventsWithinDay);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, dayEvents]) => ({ date, events: dayEvents }));
}

export function weekDatesContaining(dateStr: string, timeZone: string): string[] {
  const offset = weekdayIndexMondayFirst(dateStr, timeZone);
  const start = shiftCalendarDate(dateStr, -offset);
  return Array.from({ length: 7 }, (_, i) => shiftCalendarDate(start, i));
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
