/** Pure helpers for grow-cycle day counters, stages, and light schedule. */

export type GrowCycleStage =
  | 'propagation'
  | 'cloning'
  | 'veg'
  | 'preflower'
  | 'flower'
  | 'harvest'
  | 'drying'
  | 'trimming'
  | 'curing'
  | 'completed';

export type StartMaterial = 'seed' | 'clone';

export const GROWER_STAGE_ORDER: GrowCycleStage[] = [
  'propagation',
  'cloning',
  'veg',
  'preflower',
  'flower',
  'harvest',
  'drying',
  'trimming',
  'curing',
  'completed',
];

export type StageTransition = {
  stage: GrowCycleStage;
  startedAt: string;
};

export function stagesForStartMaterial(material: StartMaterial): GrowCycleStage[] {
  if (material === 'clone') {
    return GROWER_STAGE_ORDER.filter((s) => s !== 'propagation');
  }
  return GROWER_STAGE_ORDER.filter((s) => s !== 'cloning');
}

export function initialStageForMaterial(material: StartMaterial): GrowCycleStage {
  return material === 'clone' ? 'cloning' : 'propagation';
}

export type GrowCycleVarietyInput = {
  cultivarName: string;
  plantCount?: number | null;
  startMaterial: StartMaterial;
  comment?: string | null;
  /** Client-proposed plant row ids (one per plant); server creates matching `plants` rows. */
  plantIds?: string[];
};

/** Cycle-level start material when cultivars differ (seed wins for mixed batches). */
export function cycleStartMaterialFromVarieties(materials: StartMaterial[]): StartMaterial {
  if (materials.some((m) => m === 'seed')) return 'seed';
  return materials[0] ?? 'seed';
}

export function summarizeGrowCycleVarieties(varieties: GrowCycleVarietyInput[]): {
  cultivarName: string | null;
  plantCount: number | null;
  startMaterial: StartMaterial;
  stage: GrowCycleStage;
} {
  const names = varieties.map((v) => v.cultivarName.trim()).filter(Boolean);
  const counts = varieties
    .map((v) => v.plantCount)
    .filter((n): n is number => n != null && Number.isFinite(n) && n >= 0);
  const materials = varieties.map((v) => v.startMaterial);
  const startMaterial = cycleStartMaterialFromVarieties(materials);
  return {
    cultivarName: names.length ? names.join(', ') : null,
    plantCount: counts.length ? counts.reduce((a, b) => a + b, 0) : null,
    startMaterial,
    stage: initialStageForMaterial(startMaterial),
  };
}

export function growCycleVarietyRpcPayload(varieties: GrowCycleVarietyInput[]) {
  return varieties
    .map((v) => ({
      cultivar_name: v.cultivarName.trim() || null,
      plant_count: v.plantCount ?? null,
      start_material: v.startMaterial,
      comment: v.comment?.trim() || null,
      plant_ids: v.plantIds?.length ? v.plantIds : null,
    }))
    .filter(
      (row, index) =>
        row.cultivar_name ||
        row.plant_count != null ||
        row.comment ||
        row.start_material === 'clone' ||
        (varieties[index]?.plantIds?.length ?? 0) > 0,
    );
}

/** Keeps variety rows aligned with `growCycleVarietyRpcPayload` (photos, RPC results). */
export function alignGrowCycleVarietiesForRpc<T>(
  varieties: GrowCycleVarietyInput[],
  extras: T[],
): Array<{ variety: GrowCycleVarietyInput; extra: T }> {
  const out: Array<{ variety: GrowCycleVarietyInput; extra: T }> = [];
  for (let i = 0; i < varieties.length; i += 1) {
    const [row] = growCycleVarietyRpcPayload([varieties[i]]);
    if (!row) continue;
    out.push({ variety: varieties[i], extra: extras[i] });
  }
  return out;
}

export function growerStageRank(stage: GrowCycleStage | string): number {
  const idx = GROWER_STAGE_ORDER.indexOf(stage as GrowCycleStage);
  return idx >= 0 ? idx + 1 : 0;
}

export function isForwardStageTransition(from: GrowCycleStage, to: GrowCycleStage): boolean {
  return growerStageRank(to) > growerStageRank(from);
}

/** Forward stage targets still available from the current stage (seed vs clone entry stages). */
export function forwardStagesFrom(
  current: GrowCycleStage,
  material: StartMaterial,
): GrowCycleStage[] {
  const allowed = stagesForStartMaterial(material);
  const curRank = growerStageRank(current);
  return allowed.filter((s) => growerStageRank(s) > curRank);
}

/** Next stage in grower order only (no skipping drying/curing from flower). */
export function immediateNextStage(
  current: GrowCycleStage,
  material: StartMaterial,
): GrowCycleStage | null {
  const forward = forwardStagesFrom(current, material);
  return forward[0] ?? null;
}

/** UI label when advancing into `to`. */
export function stageAdvanceLabel(
  _from: GrowCycleStage,
  to: GrowCycleStage,
  labels: {
    stageAdvance: Record<GrowCycleStage, string>;
  },
): string {
  return labels.stageAdvance[to] ?? growerStageLabelRu(to);
}

/** Feed/calendar headline for a `stage_changed` event. */
export function stageChangedFeedLabel(
  payload: Record<string, unknown> | null | undefined,
): string {
  return growerStageLabelRu(String(payload?.to_stage ?? ''));
}

export function noonInstantForFarmCalendarDate(dateStr: string, timeZone: string): string {
  const startMs = new Date(instantForFarmCalendarDate(dateStr, timeZone)).getTime();
  return new Date(startMs + 12 * 60 * 60 * 1000).toISOString();
}

export function occurredAtForFarmCalendarDay(
  dateStr: string,
  timeZone: string,
  now: Date = new Date(),
): string {
  const today = farmCalendarDateString(timeZone, now);
  if (dateStr === today) return now.toISOString();
  return noonInstantForFarmCalendarDate(dateStr, timeZone);
}

function farmClockParts(timeZone: string, at: Date): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  return { hour: num('hour') % 24, minute: num('minute'), second: num('second') };
}

/** Wall-clock time on a farm calendar date, as a UTC instant. */
export function instantForFarmWallClock(
  dateStr: string,
  timeZone: string,
  hour: number,
  minute: number,
  second: number,
): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = target;
  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(utc));
    const num = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? '0');
    const asUtc = Date.UTC(
      num('year'),
      num('month') - 1,
      num('day'),
      num('hour') % 24,
      num('minute'),
      num('second'),
    );
    const delta = target - asUtc;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc).toISOString();
}

/**
 * Selected calendar day, with the clock of `now` in the farm timezone.
 * Today stays the exact instant. Another day keeps that day's date and the
 * current hours and minutes, so a backdated procedure is not stamped at UTC noon.
 */
export function occurredAtOnFarmCalendarDay(
  dateStr: string,
  timeZone: string,
  now: Date = new Date(),
): string {
  const today = farmCalendarDateString(timeZone, now);
  if (dateStr === today) return now.toISOString();
  const clock = farmClockParts(timeZone, now);
  return instantForFarmWallClock(dateStr, timeZone, clock.hour, clock.minute, clock.second);
}

/** e.g. 2026-10-23 → «23 октября» (ru) or localized long date. */
export function formatGrowerCalendarDate(
  dateStr: string,
  locale: string,
  options?: { includeYear?: boolean },
): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const loc = locale.startsWith('ru') ? 'ru-RU' : locale;
  return dt.toLocaleDateString(loc, {
    day: 'numeric',
    month: 'long',
    ...(options?.includeYear ? { year: 'numeric' } : {}),
  });
}

/** Human label for calendar prefill hints (ISO date in → display out). */
export function formatGrowerPrefillDate(dateStr: string, locale: string): string {
  const loc = (locale ?? 'en').toLowerCase();
  if (loc.startsWith('ru') || loc === 'uk') {
    return formatGrowerCalendarDate(dateStr, locale, { includeYear: true });
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d)}.${pad(m)}.${y}`;
}

/** Farm-local wall clock for journal prefill and procedure timestamps. */
export function formatGrowerEventDateTime(iso: string, locale: string, timeZone: string): string {
  const at = new Date(iso);
  const loc = (locale ?? 'en').startsWith('ru') ? 'ru-RU' : locale;
  const date = new Intl.DateTimeFormat(loc, {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at);
  const time = new Intl.DateTimeFormat(loc, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
  const lower = (locale ?? 'en').toLowerCase();
  if (lower.startsWith('ru') || lower === 'uk') {
    return `${date}, ${time}`;
  }
  return `${date} · ${time}`;
}

export function growerStageLabelRu(stage: GrowCycleStage | string): string {
  switch (stage) {
    case 'propagation':
      return 'проращивание';
    case 'cloning':
      return 'клонирование';
    case 'veg':
      return 'вегетация';
    case 'preflower':
      return 'предцвет';
    case 'flower':
      return 'цветение';
    case 'harvest':
      return 'харвест';
    case 'drying':
      return 'сушка';
    case 'trimming':
      return 'тримминг';
    case 'curing':
      return 'пролечка';
    case 'completed':
      return 'завершён';
    default:
      return stage;
  }
}

/** Short action label for advancing into a stage (RU grower copy). */
export function stageAdvanceActionLabelRu(stage: GrowCycleStage): string {
  switch (stage) {
    case 'flower':
      return 'Перевести в цветение';
    case 'drying':
      return 'Начать сушку';
    case 'curing':
      return 'Начать пролечку';
    case 'completed':
      return 'Завершить цикл';
    default:
      return `Перевести в ${growerStageLabelRu(stage)}`;
  }
}

/** Calendar date YYYY-MM-DD in a farm time zone. */
export function farmCalendarDateString(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at);
}

export function isFutureFarmCalendarDate(dateStr: string, todayStr: string): boolean {
  return dateStr > todayStr;
}

function calendarDateToProbeUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function instantForFarmCalendarDate(dateStr: string, timeZone: string): string {
  return startOfDayInTz(calendarDateToProbeUtc(dateStr), timeZone).toISOString();
}

function startOfDayInTz(date: Date, timeZone: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  return new Date(Date.UTC(y, m - 1, d));
}

export function cycleDayNumber(params: {
  startDate: string;
  today?: Date;
  timeZone?: string;
}): number {
  const tz = params.timeZone ?? 'UTC';
  const today = params.today ?? new Date();
  const start = startOfDayInTz(calendarDateToProbeUtc(params.startDate), tz);
  const end = startOfDayInTz(today, tz);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  return Math.max(1, days + 1);
}

export function buildStageTimeline(params: {
  cycleStartDate: string;
  initialStage: GrowCycleStage;
  transitions: Array<{ toStage: GrowCycleStage; occurredAt: string }>;
  timeZone?: string;
}): StageTransition[] {
  const tz = params.timeZone ?? 'UTC';
  const sorted = [...params.transitions].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const timeline: StageTransition[] = [
    {
      stage: params.initialStage,
      startedAt: instantForFarmCalendarDate(params.cycleStartDate, tz),
    },
  ];
  for (const t of sorted) {
    timeline.push({ stage: t.toStage, startedAt: t.occurredAt });
  }
  return timeline;
}

export function daysInCurrentStage(params: {
  timeline: StageTransition[];
  today?: Date;
  timeZone?: string;
}): number {
  const tz = params.timeZone ?? 'UTC';
  const today = params.today ?? new Date();
  const last = params.timeline[params.timeline.length - 1];
  if (!last) return 1;
  const stageStart = startOfDayInTz(new Date(last.startedAt), tz);
  const end = startOfDayInTz(today, tz);
  const diffMs = end.getTime() - stageStart.getTime();
  return Math.max(1, Math.floor(diffMs / 86_400_000) + 1);
}

export function perStageDayCounters(params: {
  timeline: StageTransition[];
  today?: Date;
  timeZone?: string;
}): Partial<Record<GrowCycleStage, number>> {
  const tz = params.timeZone ?? 'UTC';
  const today = params.today ?? new Date();
  const end = startOfDayInTz(today, tz);
  const out: Partial<Record<GrowCycleStage, number>> = {};

  for (let i = 0; i < params.timeline.length; i++) {
    const cur = params.timeline[i];
    const next = params.timeline[i + 1];
    const start = startOfDayInTz(new Date(cur.startedAt), tz);
    const stop = next ? startOfDayInTz(new Date(next.startedAt), tz) : end;
    const days = Math.max(0, Math.floor((stop.getTime() - start.getTime()) / 86_400_000) + 1);
    out[cur.stage] = (out[cur.stage] ?? 0) + days;
  }
  return out;
}

export type LightSchedule = {
  lightHoursOn: number;
  lightHoursOff: number;
  lightsOnAt: string;
};

export type PhotoperiodSegmentKind = 'light' | 'dark';

export type PhotoperiodDaySegment = {
  kind: PhotoperiodSegmentKind;
  startMinutes: number;
  endMinutes: number;
};

/** Farm wall-clock `HH:MM` or `H:MM` → minutes from midnight, or null if invalid. */
export function parseFarmWallClockTime(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

export function formatFarmWallClockTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** One 24h day strip: light block from lights-on for `lightHoursOn` hours. */
export function buildPhotoperiodDaySegments(schedule: LightSchedule): PhotoperiodDaySegment[] | null {
  const { lightHoursOn, lightHoursOff, lightsOnAt } = schedule;
  if (!validatePhotoperiodHours(lightHoursOn, lightHoursOff)) return null;
  const onMin = parseFarmWallClockTime(lightsOnAt);
  if (onMin == null) return null;

  const dayMinutes = 24 * 60;
  const offMin = (onMin + lightHoursOn * 60) % dayMinutes;

  if (onMin === offMin) {
    if (lightHoursOn >= 24) {
      return [{ kind: 'light', startMinutes: 0, endMinutes: dayMinutes }];
    }
    return [{ kind: 'dark', startMinutes: 0, endMinutes: dayMinutes }];
  }

  if (onMin < offMin) {
    const segments: PhotoperiodDaySegment[] = [];
    if (onMin > 0) segments.push({ kind: 'dark', startMinutes: 0, endMinutes: onMin });
    segments.push({ kind: 'light', startMinutes: onMin, endMinutes: offMin });
    if (offMin < dayMinutes) {
      segments.push({ kind: 'dark', startMinutes: offMin, endMinutes: dayMinutes });
    }
    return segments;
  }

  const segments: PhotoperiodDaySegment[] = [];
  if (offMin > 0) {
    segments.push({ kind: 'light', startMinutes: 0, endMinutes: offMin });
  }
  segments.push({ kind: 'dark', startMinutes: offMin, endMinutes: onMin });
  segments.push({ kind: 'light', startMinutes: onMin, endMinutes: dayMinutes });
  return segments;
}

export type LightCountdown = {
  mode: 'lights_on' | 'lights_off';
  targetAt: Date;
  labelRu: string;
};

function parseTimeToMinutes(time: string): number {
  return parseFarmWallClockTime(time) ?? 0;
}

export function nextLightTransition(params: {
  schedule: LightSchedule;
  now?: Date;
  timeZone?: string;
}): LightCountdown | null {
  const { lightHoursOn, lightHoursOff, lightsOnAt } = params.schedule;
  if (lightHoursOn + lightHoursOff !== 24) return null;
  const now = params.now ?? new Date();
  const tz = params.timeZone ?? 'UTC';

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const nowMin = hour * 60 + minute;
  const onMin = parseTimeToMinutes(lightsOnAt);
  const offMin = (onMin + lightHoursOn * 60) % (24 * 60);

  let mode: 'lights_on' | 'lights_off';
  let deltaMin: number;

  const inLight =
    onMin < offMin
      ? nowMin >= onMin && nowMin < offMin
      : nowMin >= onMin || nowMin < offMin;

  if (inLight) {
    mode = 'lights_off';
    deltaMin =
      onMin < offMin
        ? offMin - nowMin
        : nowMin < offMin
          ? offMin - nowMin
          : 24 * 60 - nowMin + offMin;
  } else {
    mode = 'lights_on';
    deltaMin =
      onMin < offMin
        ? nowMin < onMin
          ? onMin - nowMin
          : 24 * 60 - nowMin + onMin
        : nowMin >= offMin && nowMin < onMin
          ? onMin - nowMin
          : nowMin >= onMin
            ? 24 * 60 - nowMin + onMin
            : onMin - nowMin;
  }

  const targetAt = new Date(now.getTime() + deltaMin * 60_000);
  const labelRu = mode === 'lights_on' ? 'включение света' : 'выключение света';
  return { mode, targetAt, labelRu };
}

export function formatRuDecimal(value: number, fractionDigits = 1): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function lightSchedulePresetLabel(on: number, off: number): string {
  return `${on}/${off}`;
}

export function validatePhotoperiodHours(on: number, off: number): boolean {
  return Number.isFinite(on) && Number.isFinite(off) && on >= 0 && off >= 0 && on + off === 24;
}
