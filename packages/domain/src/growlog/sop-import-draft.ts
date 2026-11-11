import { isValidLocalTimeInput, normalizeLocalTime } from './sop-engine-pure';
import type { SopTriggerType } from '../types/sop';

/** Trigger types that `evalTrigger` materializes today (ADR-016 allowlist). */
export const SOP_IMPORT_ENGINE_TRIGGER_TYPES = [
  'recurring_daily',
  'recurring_interval',
  'date_based',
  'stage_based',
  'offset_based',
  'time_based',
] as const;

export type SopImportEngineTriggerType = (typeof SOP_IMPORT_ENGINE_TRIGGER_TYPES)[number];

const ENGINE_TRIGGER_SET = new Set<string>(SOP_IMPORT_ENGINE_TRIGGER_TYPES);

/** Stored in `schedule_unparsed` when the document did not name a real scope type. */
export const SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED = 'applies_to_scope_unconfirmed';

const MAX_PG_INT = 2147483647;

export const SOP_APPLIES_TO_SCOPES = [
  'farm',
  'site',
  'room',
  'tent',
  'zone',
  'bed',
  'reservoir',
  'plant_group',
  'plant',
] as const;

export type SopAppliesToScope = (typeof SOP_APPLIES_TO_SCOPES)[number];

const APPLIES_SET = new Set<string>(SOP_APPLIES_TO_SCOPES);

const CRITICALITY_LEVELS = new Set(['low', 'normal', 'high', 'critical']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SopImportTriggerDraft = {
  trigger_type: SopImportEngineTriggerType;
  trigger_config: Record<string, unknown>;
};

export type SopImportDefinitionDraft = {
  title: string;
  description: string | null;
  category: string | null;
  criticality: 'low' | 'normal' | 'high' | 'critical';
  /** Null when the document did not name a scope type. Commit rejects null. */
  applies_to_scope: SopAppliesToScope | null;
  applies_to_scope_unconfirmed: boolean;
  severity_if_missed: 'low' | 'normal' | 'high' | 'critical';
  steps: string[];
  required_inputs_after_execution: string[];
  triggers: SopImportTriggerDraft[];
  schedule_unparsed: string[];
};

export type SopImportPreviewResult = {
  drafts: SopImportDefinitionDraft[];
  dropped_trigger_count: number;
};

function isCalendarDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

function boundedInts(value: unknown, min: number, max: number): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    const n = parseWholeNumber(item);
    if (n == null || n < min || n > max || out.includes(n)) continue;
    out.push(n);
  }
  return out;
}

function parseWholeNumber(v: unknown): number | null {
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v) || v > MAX_PG_INT) return null;
    return v;
  }
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
    const n = Number(v.trim());
    if (!Number.isSafeInteger(n) || n > MAX_PG_INT) return null;
    return n;
  }
  return null;
}

function timeFields(
  cfg: Record<string, unknown>,
  requireLocalTime: boolean
): { ok: true; fields: Record<string, unknown> } | { ok: false; reason: string } {
  const fields: Record<string, unknown> = {};
  if ('local_time' in cfg && cfg.local_time != null) {
    if (typeof cfg.local_time !== 'string' || !isValidLocalTimeInput(cfg.local_time)) {
      return { ok: false, reason: 'invalid_local_time' };
    }
    fields.local_time = normalizeLocalTime(cfg.local_time);
  } else if (requireLocalTime) {
    return { ok: false, reason: 'invalid_local_time' };
  }

  const hasWindowLocal = 'window_end_local' in cfg && cfg.window_end_local != null;
  const hasWindow = 'window_end' in cfg && cfg.window_end != null;
  if (hasWindowLocal || hasWindow) {
    const raw = hasWindowLocal ? cfg.window_end_local : cfg.window_end;
    if (typeof raw !== 'string' || !isValidLocalTimeInput(raw)) {
      return { ok: false, reason: 'invalid_window_end' };
    }
    fields.window_end_local = normalizeLocalTime(raw);
  }
  return { ok: true, fields };
}

export function validateTriggerConfig(
  triggerType: SopImportEngineTriggerType,
  raw: unknown
): { ok: true; trigger_config: Record<string, unknown> } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'trigger_config_must_be_object' };
  }
  const cfg = raw as Record<string, unknown>;
  const times = timeFields(cfg, triggerType === 'time_based');
  if (!times.ok) return times;

  switch (triggerType) {
    case 'recurring_daily': {
      const trigger_config: Record<string, unknown> = { ...times.fields };
      if ('weekdays' in cfg && cfg.weekdays != null) {
        const days = boundedInts(cfg.weekdays, 1, 7);
        if (!days.length) return { ok: false, reason: 'invalid_weekdays' };
        trigger_config.weekdays = days;
      }
      if ('month_days' in cfg && cfg.month_days != null) {
        const days = boundedInts(cfg.month_days, 1, 31);
        if (!days.length) return { ok: false, reason: 'invalid_month_days' };
        trigger_config.month_days = days;
      }
      return { ok: true, trigger_config };
    }
    case 'recurring_interval': {
      const intervalDays = parseWholeNumber(cfg.interval_days);
      if (intervalDays == null || intervalDays < 1) {
        return { ok: false, reason: 'invalid_interval_days' };
      }
      return { ok: true, trigger_config: { ...times.fields, interval_days: intervalDays } };
    }
    case 'date_based': {
      const dates: string[] = Array.isArray(cfg.dates)
        ? (cfg.dates as unknown[]).filter((x): x is string => typeof x === 'string')
        : typeof cfg.date === 'string'
          ? [cfg.date]
          : [];
      const norm = dates.map((d) => d.slice(0, 10)).filter((d) => isCalendarDate(d));
      if (!norm.length) return { ok: false, reason: 'missing_dates' };
      const trigger_config: Record<string, unknown> = { ...times.fields, dates: norm };
      if (typeof cfg.label === 'string' && cfg.label.trim()) {
        trigger_config.label = cfg.label.trim().slice(0, 200);
      }
      return { ok: true, trigger_config };
    }
    case 'stage_based': {
      const stages: string[] = Array.isArray(cfg.stages)
        ? (cfg.stages as unknown[]).filter((x): x is string => typeof x === 'string')
        : typeof cfg.stage === 'string'
          ? [cfg.stage]
          : [];
      const trimmed = stages.map((s) => s.trim().slice(0, 64)).filter(Boolean).slice(0, 20);
      if (!trimmed.length) return { ok: false, reason: 'missing_stages' };
      const trigger_config: Record<string, unknown> = { ...times.fields, stages: trimmed };
      if (cfg.when != null && cfg.when !== 'during') {
        if (cfg.when !== 'enter' && cfg.when !== 'exit') {
          return { ok: false, reason: 'invalid_stage_when' };
        }
        trigger_config.when = cfg.when;
      }
      return { ok: true, trigger_config };
    }
    case 'offset_based': {
      const offset =
        cfg.offset_days != null
          ? parseWholeNumber(cfg.offset_days)
          : typeof cfg.days_after_cycle_start === 'number'
            ? parseWholeNumber(cfg.days_after_cycle_start)
            : null;
      if (offset == null || offset < 0) {
        return { ok: false, reason: 'invalid_offset_days' };
      }
      return { ok: true, trigger_config: { ...times.fields, offset_days: offset } };
    }
    case 'time_based':
      return { ok: true, trigger_config: times.fields };
    default:
      return { ok: false, reason: 'unsupported_trigger_type' };
  }
}

function parseRawTrigger(raw: unknown): {
  trigger: SopImportTriggerDraft | null;
  unparsedNote: string | null;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { trigger: null, unparsedNote: null };
  }
  const row = raw as Record<string, unknown>;
  const typeRaw = typeof row.trigger_type === 'string' ? row.trigger_type.trim() : '';
  if (!ENGINE_TRIGGER_SET.has(typeRaw)) {
    const note =
      typeRaw && typeRaw !== 'manual' && typeRaw !== 'event_based'
        ? `Unsupported trigger type: ${typeRaw}`
        : typeRaw
          ? `Trigger not imported (${typeRaw})`
          : null;
    return { trigger: null, unparsedNote: note };
  }
  const triggerType = typeRaw as SopImportEngineTriggerType;
  const validated = validateTriggerConfig(triggerType, row.trigger_config ?? row.config ?? {});
  if (!validated.ok) {
    return {
      trigger: null,
      unparsedNote: `Could not parse ${triggerType}: ${validated.reason}`,
    };
  }
  return {
    trigger: { trigger_type: triggerType, trigger_config: validated.trigger_config },
    unparsedNote: null,
  };
}

function parseCriticality(v: unknown, fallback: 'normal'): 'low' | 'normal' | 'high' | 'critical' {
  if (typeof v === 'string' && CRITICALITY_LEVELS.has(v)) {
    return v as 'low' | 'normal' | 'high' | 'critical';
  }
  return fallback;
}

function parseAppliesToScope(v: unknown): SopAppliesToScope | null {
  if (typeof v === 'string' && APPLIES_SET.has(v)) return v as SopAppliesToScope;
  return null;
}

function parseRequiredInputs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim().slice(0, 64))
    .filter(Boolean)
    .slice(0, 30);
}

function parseSteps(v: unknown, bodyFallback: string): string[] {
  if (Array.isArray(v)) {
    const steps = v
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length) return steps.slice(0, 80);
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const nested = (v as { steps?: unknown }).steps;
    if (Array.isArray(nested)) {
      const steps = nested
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
      if (steps.length) return steps.slice(0, 80);
    }
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 80);
  }
  return bodyFallback
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);
}

export function sanitizeSopImportDraft(raw: unknown): SopImportDefinitionDraft | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  if (!title) return null;

  const description =
    typeof row.description === 'string' && row.description.trim()
      ? row.description.trim().slice(0, 4000)
      : null;
  const category =
    typeof row.category === 'string' && row.category.trim()
      ? row.category.trim().slice(0, 64)
      : null;

  const bodyFallback =
    typeof row.body === 'string'
      ? row.body.trim()
      : typeof row.instructions === 'string'
        ? row.instructions.trim()
        : description ?? title;

  const steps = parseSteps(row.steps ?? row.instructions_json, bodyFallback);
  if (!steps.length) return null;

  const schedule_unparsed: string[] = [];
  if (typeof row.schedule_unparsed === 'string' && row.schedule_unparsed.trim()) {
    schedule_unparsed.push(row.schedule_unparsed.trim().slice(0, 500));
  } else if (Array.isArray(row.schedule_unparsed)) {
    for (const n of row.schedule_unparsed) {
      if (typeof n === 'string' && n.trim()) schedule_unparsed.push(n.trim().slice(0, 500));
    }
  }

  const triggers: SopImportTriggerDraft[] = [];
  const triggerList = Array.isArray(row.triggers) ? row.triggers : [];
  for (const tr of triggerList) {
    const { trigger, unparsedNote } = parseRawTrigger(tr);
    if (trigger) triggers.push(trigger);
    if (unparsedNote) schedule_unparsed.push(unparsedNote);
  }

  const applies_to_scope = parseAppliesToScope(row.applies_to_scope);
  const keepUnconfirmedNote =
    applies_to_scope == null || schedule_unparsed.includes(SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED);
  const notes = schedule_unparsed
    .filter((n) => n !== SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED)
    .slice(0, keepUnconfirmedNote ? 9 : 10);
  if (keepUnconfirmedNote) notes.unshift(SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED);

  return {
    title: title.slice(0, 200),
    description,
    category,
    criticality: parseCriticality(row.criticality, 'normal'),
    applies_to_scope,
    applies_to_scope_unconfirmed: keepUnconfirmedNote,
    severity_if_missed: parseCriticality(row.severity_if_missed, 'normal'),
    steps,
    required_inputs_after_execution: parseRequiredInputs(row.required_inputs_after_execution),
    triggers: triggers.slice(0, 12),
    schedule_unparsed: notes,
  };
}

export function parseSopImportModelJson(raw: string): SopImportPreviewResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid_classifier_json');
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { drafts?: unknown }).drafts)
      ? (parsed as { drafts: unknown[] }).drafts
      : parsed && typeof parsed === 'object' && (parsed as { draft?: unknown }).draft
        ? [(parsed as { draft: unknown }).draft]
        : [];

  let dropped_trigger_count = 0;
  const drafts: SopImportDefinitionDraft[] = [];
  for (const item of list) {
    const rawTriggers =
      item && typeof item === 'object' && !Array.isArray(item)
        ? Array.isArray((item as { triggers?: unknown }).triggers)
          ? (item as { triggers: unknown[] }).triggers.length
          : 0
        : 0;
    const draft = sanitizeSopImportDraft(item);
    if (!draft) continue;
    dropped_trigger_count += Math.max(0, rawTriggers - draft.triggers.length);
    drafts.push(draft);
  }
  return { drafts: drafts.slice(0, 25), dropped_trigger_count };
}

/** Reject client payloads that smuggle non-engine trigger types. */
export function assertCommitDrafts(drafts: SopImportDefinitionDraft[]): void {
  for (const d of drafts) {
    if (!d.applies_to_scope || !APPLIES_SET.has(d.applies_to_scope)) {
      throw new Error('missing_applies_to_scope');
    }
    for (const tr of d.triggers) {
      if (!ENGINE_TRIGGER_SET.has(tr.trigger_type)) {
        throw new Error('invalid_trigger_type');
      }
      const v = validateTriggerConfig(tr.trigger_type, tr.trigger_config);
      if (!v.ok) throw new Error(v.reason);
    }
  }
}

export function instructionsJsonFromSteps(steps: string[]): Record<string, unknown> {
  return { steps };
}

export function stepsFromMultilineText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);
}

/** HH:MM for UI time input from first recurring_daily trigger. */
export function getDailyLocalTimeForEdit(triggers: SopImportTriggerDraft[]): string {
  const daily = triggers.find((t) => t.trigger_type === 'recurring_daily');
  const lt = daily?.trigger_config?.local_time;
  if (typeof lt === 'string') {
    const m = /^(\d{1,2}:\d{2})/.exec(lt.trim());
    if (m) return m[1]!.length === 4 ? `0${m[1]}` : m[1]!.slice(0, 5);
  }
  return '09:00';
}

export function setDailyLocalTimeOnTriggers(
  triggers: SopImportTriggerDraft[],
  hhmm: string
): SopImportTriggerDraft[] {
  const validated = validateTriggerConfig('recurring_daily', { local_time: hhmm });
  if (!validated.ok) return triggers;
  const rest = triggers.filter((t) => t.trigger_type !== 'recurring_daily');
  return [...rest, { trigger_type: 'recurring_daily', trigger_config: validated.trigger_config }];
}

/** For persistence layer typing. */
export function isEngineTriggerType(t: string): t is SopTriggerType {
  return ENGINE_TRIGGER_SET.has(t);
}

export type SopImportTriggerDisplay =
  | { kind: 'daily'; time: string }
  | { kind: 'weekdays'; days: string; time: string }
  | { kind: 'month_days'; days: string; time: string }
  | { kind: 'interval'; days: string; time: string }
  | { kind: 'date'; date: string }
  | { kind: 'stage'; stage: string }
  | { kind: 'stage_enter'; stage: string; time: string }
  | { kind: 'stage_exit'; stage: string; time: string }
  | { kind: 'offset'; days: string }
  | { kind: 'time'; time: string };

function cfgTime(cfg: Record<string, unknown>): string {
  const lt = cfg.local_time ?? cfg.time;
  if (typeof lt === 'string') {
    const m = /^(\d{1,2}:\d{2})/.exec(lt.trim());
    if (m) return m[1]!.slice(0, 5);
  }
  return '09:00';
}

/** Structured pieces for i18n labels in import review UI. */
export function describeImportTriggerDisplay(tr: SopImportTriggerDraft): SopImportTriggerDisplay | null {
  const cfg = tr.trigger_config ?? {};
  switch (tr.trigger_type) {
    case 'recurring_daily': {
      const time = cfgTime(cfg);
      if (Array.isArray(cfg.weekdays) && cfg.weekdays.length) {
        return { kind: 'weekdays', days: cfg.weekdays.join(', '), time };
      }
      if (Array.isArray(cfg.month_days) && cfg.month_days.length) {
        return { kind: 'month_days', days: cfg.month_days.join(', '), time };
      }
      return { kind: 'daily', time };
    }
    case 'recurring_interval': {
      const days =
        typeof cfg.interval_days === 'number'
          ? String(cfg.interval_days)
          : typeof cfg.interval_days === 'string'
            ? cfg.interval_days
            : '?';
      return { kind: 'interval', days, time: cfgTime(cfg) };
    }
    case 'date_based': {
      const fromList = Array.isArray(cfg.dates)
        ? cfg.dates.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      const single =
        typeof cfg.date === 'string'
          ? cfg.date
          : typeof cfg.due_date === 'string'
            ? cfg.due_date
            : null;
      const dates = fromList.length ? fromList : single ? [single] : [];
      if (!dates.length) return null;
      return { kind: 'date', date: dates.join(', ') };
    }
    case 'stage_based': {
      const fromList = Array.isArray(cfg.stages)
        ? cfg.stages.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      const single =
        typeof cfg.stage === 'string'
          ? cfg.stage
          : typeof cfg.stage_name === 'string'
            ? cfg.stage_name
            : null;
      const stages = fromList.length ? fromList : single ? [single] : [];
      if (!stages.length) return null;
      const stage = stages.join(', ');
      const time = cfgTime(cfg);
      if (cfg.when === 'enter') return { kind: 'stage_enter', stage, time };
      if (cfg.when === 'exit') return { kind: 'stage_exit', stage, time };
      return { kind: 'stage', stage };
    }
    case 'offset_based': {
      const od = cfg.offset_days ?? cfg.days;
      const days =
        typeof od === 'number' ? String(od) : typeof od === 'string' ? od : '?';
      return { kind: 'offset', days };
    }
    case 'time_based':
      return { kind: 'time', time: cfgTime(cfg) };
    default:
      return null;
  }
}
