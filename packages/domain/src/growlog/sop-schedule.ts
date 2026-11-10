import { GROWER_STAGE_ORDER, type GrowCycleStage } from './cycle-tracking';
import { validateTriggerConfig } from './sop-import-draft';

/** ISO weekday: Monday = 1 … Sunday = 7. `anchorDate` is a civil `YYYY-MM-DD`. */
export function isoWeekday(anchorDate: string): number {
  const [year, month, day] = anchorDate.slice(0, 10).split('-').map((part) => Number(part));
  const utc = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  const sunday0 = utc.getUTCDay();
  return sunday0 === 0 ? 7 : sunday0;
}

export function monthDay(anchorDate: string): number {
  return Number(anchorDate.slice(8, 10));
}

export function weekdayShortLabels(locale: string): string[] {
  const loc = locale.toLowerCase().startsWith('ru') ? 'ru-RU' : locale || 'en';
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 9 + index));
    return new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(date);
  });
}

function intList(value: unknown, min: number, max: number): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    const n =
      typeof item === 'number'
        ? item
        : typeof item === 'string' && /^\d+$/.test(item.trim())
          ? Number(item.trim())
          : NaN;
    if (!Number.isInteger(n) || n < min || n > max || out.includes(n)) continue;
    out.push(n);
  }
  return out;
}

/** Missing `weekdays` / `month_days` means every day. A present list must hit this date. */
export function recurringDailyMatchesDate(anchorDate: string, cfg: Record<string, unknown>): boolean {
  if (cfg.weekdays != null) {
    const days = intList(cfg.weekdays, 1, 7);
    if (!days.includes(isoWeekday(anchorDate))) return false;
  }
  if (cfg.month_days != null) {
    const days = intList(cfg.month_days, 1, 31);
    if (!days.includes(monthDay(anchorDate))) return false;
  }
  return true;
}

export type SopStageEdge = {
  fromStage: string | null;
  toStage: string | null;
};

function stageNames(cfg: Record<string, unknown>): string[] {
  if (Array.isArray(cfg.stages)) {
    return cfg.stages.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof cfg.stage === 'string' && cfg.stage.trim()) return [cfg.stage.trim()];
  return [];
}

/**
 * `when` omitted or `during`: every day the cycle is already in the stage.
 * `enter` / `exit`: the farm-local day of a `stage_changed` event.
 */
export function stageBasedMatches(params: {
  cfg: Record<string, unknown>;
  cycleStage: string;
  transitions: SopStageEdge[];
}): boolean {
  const stages = stageNames(params.cfg);
  if (!stages.length) return false;
  const when = params.cfg.when === 'enter' || params.cfg.when === 'exit' ? params.cfg.when : 'during';
  if (when === 'enter') {
    return params.transitions.some((edge) => edge.toStage != null && stages.includes(edge.toStage));
  }
  if (when === 'exit') {
    return params.transitions.some((edge) => edge.fromStage != null && stages.includes(edge.fromStage));
  }
  return stages.includes(params.cycleStage);
}

export type SopManualSchedule =
  | { kind: 'daily'; localTime: string }
  | { kind: 'weekdays'; localTime: string; weekdays: number[] }
  | { kind: 'month_day'; localTime: string; monthDay: number }
  | { kind: 'stage_enter'; localTime: string; stage: string }
  | { kind: 'stage_exit'; localTime: string; stage: string };

const STAGE_SET = new Set<string>(GROWER_STAGE_ORDER);

export function isGrowCycleStage(value: string): value is GrowCycleStage {
  return STAGE_SET.has(value);
}

export function buildManualSopTrigger(schedule: SopManualSchedule): {
  trigger_type: 'recurring_daily' | 'stage_based';
  trigger_config: Record<string, unknown>;
} {
  if (schedule.kind === 'stage_enter' || schedule.kind === 'stage_exit') {
    if (!isGrowCycleStage(schedule.stage)) throw new Error('invalid_stage');
    const validated = validateTriggerConfig('stage_based', {
      stages: [schedule.stage],
      when: schedule.kind === 'stage_enter' ? 'enter' : 'exit',
      local_time: schedule.localTime,
    });
    if (!validated.ok) throw new Error(validated.reason);
    return { trigger_type: 'stage_based', trigger_config: validated.trigger_config };
  }

  const config: Record<string, unknown> = { local_time: schedule.localTime };
  if (schedule.kind === 'weekdays') {
    config.weekdays = schedule.weekdays;
  }
  if (schedule.kind === 'month_day') {
    config.month_days = [schedule.monthDay];
  }
  const validated = validateTriggerConfig('recurring_daily', config);
  if (!validated.ok) throw new Error(validated.reason);
  return { trigger_type: 'recurring_daily', trigger_config: validated.trigger_config };
}
