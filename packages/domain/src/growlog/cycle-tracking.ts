/** Pure helpers for grow-cycle day counters, stages, and light schedule. */

export type GrowCycleStage =
  | 'propagation'
  | 'veg'
  | 'preflower'
  | 'flower'
  | 'drying'
  | 'curing'
  | 'completed';

export type StartMaterial = 'seed' | 'clone';

export const GROWER_STAGE_ORDER: GrowCycleStage[] = [
  'propagation',
  'veg',
  'preflower',
  'flower',
  'drying',
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
  return [...GROWER_STAGE_ORDER];
}

export function initialStageForMaterial(material: StartMaterial): GrowCycleStage {
  return material === 'clone' ? 'veg' : 'propagation';
}

export function growerStageLabelRu(stage: GrowCycleStage | string): string {
  switch (stage) {
    case 'propagation':
      return 'проращивание';
    case 'veg':
      return 'вегетация';
    case 'preflower':
      return 'предцвет';
    case 'flower':
      return 'цветение';
    case 'drying':
      return 'сушка';
    case 'curing':
      return 'доводка';
    case 'completed':
      return 'завершён';
    default:
      return stage;
  }
}

function parseDateOnly(isoDate: string, tz: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc;
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
  const start = startOfDayInTz(parseDateOnly(params.startDate, tz), tz);
  const end = startOfDayInTz(today, tz);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  return Math.max(1, days + 1);
}

export function buildStageTimeline(params: {
  cycleStartDate: string;
  initialStage: GrowCycleStage;
  transitions: Array<{ toStage: GrowCycleStage; occurredAt: string }>;
}): StageTransition[] {
  const sorted = [...params.transitions].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const timeline: StageTransition[] = [
    { stage: params.initialStage, startedAt: `${params.cycleStartDate}T00:00:00.000Z` },
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

export type LightCountdown = {
  mode: 'lights_on' | 'lights_off';
  targetAt: Date;
  labelRu: string;
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
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
