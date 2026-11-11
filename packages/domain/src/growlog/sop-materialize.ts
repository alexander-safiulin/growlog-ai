/**
 * SOP materialize (ADR-006): trigger evaluation, run generation, overdue pass.
 * Uses Postgres RPC `create_sop_run_with_due_event` and `refresh_sop_compliance_daily`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import {
  computeRunPriority,
  isRunPastDue,
  normalizeLocalTime,
  type SopRunPriorityDb,
} from './sop-engine-pure';
import {
  recurringDailyMatchesDate,
  stageBasedMatches,
  type SopStageEdge,
} from './sop-schedule';
import type { SopTriggerType } from '../types/sop';

export function farmLocalDateString(timezone: string, at: Date = new Date()): string {
  return formatInTimeZone(at, timezone || 'UTC', 'yyyy-MM-dd');
}

export function farmAnchorDateFromOccurredAt(occurredAtIso: string, timezone: string): string {
  return formatInTimeZone(new Date(occurredAtIso), timezone || 'UTC', 'yyyy-MM-dd');
}

async function createMissedSopDeviation(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
    sopRunId: string;
    title: string;
    severity: string;
  }
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('deviations')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('sop_run_id', params.sopRunId)
    .neq('status', 'closed')
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const mapped =
    params.severity === 'critical' || params.severity === 'high' ? params.severity : 'high';
  const { data, error } = await supabase
    .from('deviations')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      sop_run_id: params.sopRunId,
      title: `Missed SOP: ${params.title}`,
      description: 'Critical SOP run passed its due window.',
      severity: mapped,
      status: 'open',
      metadata: { auto: true, reason: 'sop_missed' },
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data?.id as string) ?? null;
}

type DefinitionLite = {
  id: string;
  active: boolean;
  criticality: string;
  severity_if_missed: string;
};

type TriggerRow = {
  id: string;
  trigger_type: SopTriggerType;
  trigger_config: Record<string, unknown>;
  active: boolean;
};

function parseTimeConfig(cfg: Record<string, unknown>): { localTime: string; windowEndLocal: string | null } {
  const lt = typeof cfg.local_time === 'string' ? normalizeLocalTime(cfg.local_time) : '09:00:00';
  const we =
    typeof cfg.window_end_local === 'string'
      ? normalizeLocalTime(cfg.window_end_local)
      : typeof cfg.window_end === 'string'
        ? normalizeLocalTime(cfg.window_end)
        : null;
  return { localTime: lt, windowEndLocal: we };
}

function localIsoToUtc(anchorDate: string, localHms: string, tz: string): Date {
  const isoLocal = `${anchorDate}T${localHms}`;
  return toDate(isoLocal, { timeZone: tz });
}

export type MaterializeResult = {
  created: number;
  /** @deprecated use skippedIneligible + evalNoMatch */
  skippedTriggers: number;
  skippedIneligible: number;
  evalNoMatch: number;
  overdueUpdated: number;
  complianceRefreshed: boolean;
};

/**
 * Marks open/acknowledged runs overdue when coalesce(due_window_end, due_at) is in the past.
 */
export async function applySopOverdueForCycle(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; now?: Date }
): Promise<number> {
  const now = params.now ?? new Date();
  const { data: rows, error } = await supabase
    .from('sop_runs')
    .select('id, due_at, due_window_end, status')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('status', ['open', 'acknowledged']);
  if (error) throw error;

  const overdueIds = (rows ?? [])
    .filter((r) => isRunPastDue(now, r))
    .map((r) => r.id);

  if (overdueIds.length === 0) return 0;

  const { error: upErr } = await supabase
    .from('sop_runs')
    .update({ status: 'overdue' })
    .in('id', overdueIds);
  if (upErr) throw upErr;

  const { data: missed } = await supabase
    .from('sop_runs')
    .select('id, scope_id, sop_definition_id, sop_definitions(title, criticality, severity_if_missed)')
    .in('id', overdueIds);
  for (const run of missed ?? []) {
    const def = run.sop_definitions as
      | { title?: string; criticality?: string; severity_if_missed?: string }
      | { title?: string; criticality?: string; severity_if_missed?: string }[]
      | null;
    const row = Array.isArray(def) ? def[0] : def;
    const severity = row?.severity_if_missed ?? row?.criticality ?? 'normal';
    if (severity !== 'critical' && row?.criticality !== 'critical') continue;
    await createMissedSopDeviation(supabase, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      scopeId: (run.scope_id as string | null) ?? null,
      sopRunId: run.id as string,
      title: row?.title ?? 'SOP',
      severity: 'critical',
    });
  }

  return overdueIds.length;
}

async function insertRunWithDueEvent(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
    sopDefinitionId: string;
    triggerId: string | null;
    assignmentId: string | null;
    anchorDate: string | null;
    dueAt: string | null;
    dueWindowStart: string | null;
    dueWindowEnd: string | null;
    priority: SopRunPriorityDb;
    reasonText: string | null;
    triggerSnapshot: Record<string, unknown>;
    sourceEventId: string | null;
  }
): Promise<{ runId: string } | null> {
  const { data: runId, error: rpcErr } = await supabase.rpc('create_sop_run_with_due_event', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_scope_id: params.scopeId,
    p_sop_definition_id: params.sopDefinitionId,
    p_trigger_id: params.triggerId,
    p_assignment_id: params.assignmentId,
    p_anchor_date: params.anchorDate,
    p_due_at: params.dueAt,
    p_due_window_start: params.dueWindowStart,
    p_due_window_end: params.dueWindowEnd,
    p_priority: params.priority,
    p_reason_text: params.reasonText,
    p_trigger_snapshot: params.triggerSnapshot,
    p_source_event_id: params.sourceEventId,
  });

  if (rpcErr) {
    const code = rpcErr.code ?? '';
    const msg = rpcErr.message ?? '';
    if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique')) return null;
    throw rpcErr;
  }
  if (runId == null) return null;
  const rid = typeof runId === 'string' ? runId : String(runId);
  if (!rid) return null;
  return { runId: rid };
}

/** Recomputes `sop_compliance_daily` for one calendar day (anchor_date scope). */
export async function refreshSopComplianceForDay(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; onDate: string }
): Promise<void> {
  const { error } = await supabase.rpc('refresh_sop_compliance_daily', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_on: params.onDate,
  });
  if (error) throw error;
}

type EvalResult =
  | {
      kind: 'create';
      dueAt: string | null;
      dueWindowStart: string | null;
      dueWindowEnd: string | null;
      anchorDate: string | null;
      reasonText: string | null;
      snapshot: Record<string, unknown>;
    }
  | { kind: 'skip' };

function recurringReason(cfg: Record<string, unknown>): string {
  if (cfg.weekdays != null) return 'SOP on selected weekdays';
  if (cfg.month_days != null) return 'SOP on selected days of the month';
  return 'Daily SOP schedule';
}

function stageReason(cfg: Record<string, unknown>, cycleStage: string): string {
  const stage = Array.isArray(cfg.stages) && typeof cfg.stages[0] === 'string' ? cfg.stages[0] : cycleStage;
  if (cfg.when === 'enter') return `Stage ${stage} started`;
  if (cfg.when === 'exit') return `Stage ${stage} ended`;
  return `Stage ${cycleStage} SOP`;
}

function anchorLookupWindow(anchorDate: string): { start: string; end: string } {
  const [year, month, day] = anchorDate.split('-').map((part) => Number(part));
  const start = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) - 1));
  const end = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 2));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function stageEdgesOnAnchor(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; anchorDate: string; timezone: string }
): Promise<SopStageEdge[]> {
  const window = anchorLookupWindow(params.anchorDate);
  const { data, error } = await supabase
    .from('events')
    .select('payload, occurred_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('event_type', 'stage_changed')
    .gte('occurred_at', window.start)
    .lt('occurred_at', window.end);
  if (error) throw error;
  const edges: SopStageEdge[] = [];
  for (const row of data ?? []) {
    const occurred = (row as { occurred_at?: string }).occurred_at;
    if (!occurred) continue;
    const localDay = formatInTimeZone(new Date(occurred), params.timezone || 'UTC', 'yyyy-MM-dd');
    if (localDay !== params.anchorDate) continue;
    const payload = (row as { payload?: unknown }).payload;
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    edges.push({
      fromStage: typeof record.from_stage === 'string' ? record.from_stage : null,
      toStage: typeof record.to_stage === 'string' ? record.to_stage : null,
    });
  }
  return edges;
}

function evalTrigger(params: {
  trigger: TriggerRow;
  anchorDate: string;
  tz: string;
  cycleStartDate: string;
  cycleStage: string;
  stageTransitions: SopStageEdge[];
  farmId: string;
}): EvalResult {
  const { trigger, anchorDate, tz, cycleStartDate, cycleStage, stageTransitions, farmId } = params;
  const cfg = trigger.trigger_config ?? {};

  switch (trigger.trigger_type) {
    case 'recurring_daily': {
      if (!recurringDailyMatchesDate(anchorDate, cfg)) return { kind: 'skip' };
      const { localTime, windowEndLocal } = parseTimeConfig(cfg);
      const start = localIsoToUtc(anchorDate, localTime, tz);
      if (Number.isNaN(start.getTime())) return { kind: 'skip' };
      let dueWindowStart: string | null = null;
      let dueWindowEnd: string | null = null;
      let dueAt: string | null = start.toISOString();
      if (windowEndLocal) {
        const end = localIsoToUtc(anchorDate, windowEndLocal, tz);
        if (!Number.isNaN(end.getTime()) && end > start) {
          dueWindowStart = start.toISOString();
          dueWindowEnd = end.toISOString();
          dueAt = dueWindowEnd;
        }
      }
      return {
        kind: 'create',
        dueAt,
        dueWindowStart,
        dueWindowEnd,
        anchorDate,
        reasonText: recurringReason(cfg),
        snapshot: {
          trigger_type: 'recurring_daily',
          anchor_date: anchorDate,
          local_time: localTime,
          weekdays: cfg.weekdays ?? null,
          month_days: cfg.month_days ?? null,
          timezone: tz,
          farm_id: farmId,
        },
      };
    }
    case 'recurring_interval': {
      const intervalDays = typeof cfg.interval_days === 'number' ? cfg.interval_days : 1;
      if (intervalDays < 1) return { kind: 'skip' };
      const startDay = parseISO(cycleStartDate.slice(0, 10));
      const anchor = parseISO(anchorDate);
      const d0 = differenceInCalendarDays(anchor, startDay);
      if (d0 < 0) return { kind: 'skip' };
      if (d0 % intervalDays !== 0) return { kind: 'skip' };
      const { localTime, windowEndLocal } = parseTimeConfig(cfg);
      const start = localIsoToUtc(anchorDate, localTime, tz);
      if (Number.isNaN(start.getTime())) return { kind: 'skip' };
      let dueWindowStart: string | null = null;
      let dueWindowEnd: string | null = null;
      let dueAt: string | null = start.toISOString();
      if (windowEndLocal) {
        const end = localIsoToUtc(anchorDate, windowEndLocal, tz);
        if (!Number.isNaN(end.getTime()) && end > start) {
          dueWindowStart = start.toISOString();
          dueWindowEnd = end.toISOString();
          dueAt = dueWindowEnd;
        }
      }
      return {
        kind: 'create',
        dueAt,
        dueWindowStart,
        dueWindowEnd,
        anchorDate,
        reasonText: `Every ${intervalDays} day(s) from cycle start`,
        snapshot: {
          trigger_type: 'recurring_interval',
          interval_days: intervalDays,
          anchor_date: anchorDate,
          cycle_start_date: cycleStartDate,
          local_time: localTime,
          timezone: tz,
          farm_id: farmId,
        },
      };
    }
    case 'date_based': {
      const dates: string[] = Array.isArray(cfg.dates)
        ? (cfg.dates as unknown[]).filter((x): x is string => typeof x === 'string')
        : typeof cfg.date === 'string'
          ? [cfg.date]
          : [];
      const norm = dates.map((d) => d.slice(0, 10));
      if (!norm.includes(anchorDate)) return { kind: 'skip' };
      const { localTime, windowEndLocal } = parseTimeConfig(cfg);
      const start = localIsoToUtc(anchorDate, localTime, tz);
      if (Number.isNaN(start.getTime())) return { kind: 'skip' };
      let dueWindowStart: string | null = null;
      let dueWindowEnd: string | null = null;
      let dueAt: string | null = start.toISOString();
      if (windowEndLocal) {
        const end = localIsoToUtc(anchorDate, windowEndLocal, tz);
        if (!Number.isNaN(end.getTime()) && end > start) {
          dueWindowStart = start.toISOString();
          dueWindowEnd = end.toISOString();
          dueAt = dueWindowEnd;
        }
      }
      return {
        kind: 'create',
        dueAt,
        dueWindowStart,
        dueWindowEnd,
        anchorDate,
        reasonText: typeof cfg.label === 'string' ? cfg.label : 'Calendar SOP',
        snapshot: {
          trigger_type: 'date_based',
          anchor_date: anchorDate,
          matched_dates: norm.filter((d) => d === anchorDate),
          timezone: tz,
          farm_id: farmId,
        },
      };
    }
    case 'stage_based': {
      if (!stageBasedMatches({ cfg, cycleStage, transitions: stageTransitions })) return { kind: 'skip' };
      const { localTime, windowEndLocal } = parseTimeConfig(cfg);
      const start = localIsoToUtc(anchorDate, localTime, tz);
      if (Number.isNaN(start.getTime())) return { kind: 'skip' };
      let dueWindowStart: string | null = null;
      let dueWindowEnd: string | null = null;
      let dueAt: string | null = start.toISOString();
      if (windowEndLocal) {
        const end = localIsoToUtc(anchorDate, windowEndLocal, tz);
        if (!Number.isNaN(end.getTime()) && end > start) {
          dueWindowStart = start.toISOString();
          dueWindowEnd = end.toISOString();
          dueAt = dueWindowEnd;
        }
      }
      return {
        kind: 'create',
        dueAt,
        dueWindowStart,
        dueWindowEnd,
        anchorDate,
        reasonText: stageReason(cfg, cycleStage),
        snapshot: {
          trigger_type: 'stage_based',
          when: cfg.when === 'enter' || cfg.when === 'exit' ? cfg.when : 'during',
          cycle_stage: cycleStage,
          anchor_date: anchorDate,
          timezone: tz,
          farm_id: farmId,
        },
      };
    }
    case 'offset_based': {
      const offsetDays =
        typeof cfg.offset_days === 'number'
          ? cfg.offset_days
          : typeof cfg.days_after_cycle_start === 'number'
            ? cfg.days_after_cycle_start
            : null;
      if (offsetDays == null) return { kind: 'skip' };
      const startDay = parseISO(cycleStartDate.slice(0, 10));
      const anchor = parseISO(anchorDate);
      const d0 = differenceInCalendarDays(anchor, startDay);
      if (d0 !== offsetDays) return { kind: 'skip' };
      const { localTime, windowEndLocal } = parseTimeConfig(cfg);
      const start = localIsoToUtc(anchorDate, localTime, tz);
      if (Number.isNaN(start.getTime())) return { kind: 'skip' };
      let dueAt: string | null = start.toISOString();
      let dueWindowStart: string | null = null;
      let dueWindowEnd: string | null = null;
      if (windowEndLocal) {
        const end = localIsoToUtc(anchorDate, windowEndLocal, tz);
        if (!Number.isNaN(end.getTime()) && end > start) {
          dueWindowStart = start.toISOString();
          dueWindowEnd = end.toISOString();
          dueAt = dueWindowEnd;
        }
      }
      return {
        kind: 'create',
        dueAt,
        dueWindowStart,
        dueWindowEnd,
        anchorDate,
        reasonText: `Offset day ${offsetDays} from cycle start`,
        snapshot: {
          trigger_type: 'offset_based',
          offset_days: offsetDays,
          anchor_date: anchorDate,
          timezone: tz,
          farm_id: farmId,
        },
      };
    }
    case 'time_based': {
      const { localTime, windowEndLocal } = parseTimeConfig(cfg);
      const start = localIsoToUtc(anchorDate, localTime, tz);
      if (Number.isNaN(start.getTime())) return { kind: 'skip' };
      const endH = windowEndLocal ?? localTime;
      const end = localIsoToUtc(anchorDate, endH, tz);
      if (Number.isNaN(end.getTime())) return { kind: 'skip' };
      return {
        kind: 'create',
        dueAt: end.toISOString(),
        dueWindowStart: start.toISOString(),
        dueWindowEnd: end.toISOString(),
        anchorDate,
        reasonText: 'Time window SOP',
        snapshot: {
          trigger_type: 'time_based',
          anchor_date: anchorDate,
          local_time: localTime,
          window_end_local: endH,
          timezone: tz,
          farm_id: farmId,
        },
      };
    }
    default:
      return { kind: 'skip' };
  }
}

/**
 * Evaluates assignments/triggers for a calendar day in farm TZ and creates runs per matching
 * trigger. Deduplication is per (assignment, anchor_date, trigger_id) — see
 * `sop_runs_assignment_anchor_trigger_unique`.
 */
export async function materializeSopRunsForDay(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    anchorDate: string;
    timezone: string;
    now?: Date;
  }
): Promise<MaterializeResult> {
  const tz = params.timezone || 'UTC';
  const now = params.now ?? new Date();
  let created = 0;
  let skippedIneligible = 0;
  let evalNoMatch = 0;

  const { data: cycle, error: cErr } = await supabase
    .from('grow_cycles')
    .select('id, start_date, farm_id, stage')
    .eq('id', params.cycleId)
    .eq('farm_id', params.farmId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cycle?.start_date) throw new Error('cycle_not_found');

  const stageTransitions = await stageEdgesOnAnchor(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    anchorDate: params.anchorDate,
    timezone: tz,
  });

  const { data: assignments, error: asnErr } = await supabase
    .from('sop_assignments')
    .select('id, scope_id, sop_definition_id')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('assignment_status', 'active');
  if (asnErr) throw asnErr;

  for (const a of assignments ?? []) {
    const { data: def, error: dErr } = await supabase
      .from('sop_definitions')
      .select('id, active, criticality, severity_if_missed')
      .eq('id', a.sop_definition_id)
      .single();
    if (dErr) throw dErr;
    const definition = def as DefinitionLite | null;
    if (!definition?.active) continue;

    const { data: existingRuns, error: exErr } = await supabase
      .from('sop_runs')
      .select('trigger_id')
      .eq('assignment_id', a.id)
      .eq('anchor_date', params.anchorDate);
    if (exErr) throw exErr;
    const materializedTriggerIds = new Set(
      (existingRuns ?? [])
        .map((row) => row.trigger_id as string | null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    const { data: triggers, error: tErr } = await supabase
      .from('sop_triggers')
      .select('id, trigger_type, trigger_config, active')
      .eq('sop_definition_id', a.sop_definition_id)
      .eq('active', true)
      .order('id');
    if (tErr) throw tErr;

    for (const tr of triggers ?? []) {
      const trigger = tr as TriggerRow;
      if (
        trigger.trigger_type === 'manual' ||
        trigger.trigger_type === 'event_based' ||
        trigger.trigger_type === 'condition_based' ||
        trigger.trigger_type === 'location_based'
      ) {
        skippedIneligible += 1;
        continue;
      }
      if (materializedTriggerIds.has(trigger.id)) continue;

      const evaluated = evalTrigger({
        trigger,
        anchorDate: params.anchorDate,
        tz,
        cycleStartDate: String(cycle.start_date),
        cycleStage: String((cycle as { stage?: string }).stage ?? 'veg'),
        stageTransitions,
        farmId: params.farmId,
      });
      if (evaluated.kind === 'skip') {
        evalNoMatch += 1;
        continue;
      }

      const isOverdue =
        evaluated.dueWindowEnd || evaluated.dueAt
          ? isRunPastDue(now, {
              due_at: evaluated.dueAt,
              due_window_end: evaluated.dueWindowEnd,
            })
          : false;

      const priority = computeRunPriority({
        criticality: definition.criticality,
        severity_if_missed: definition.severity_if_missed,
        isOverdue,
      });

      const snap = {
        ...evaluated.snapshot,
        sop_trigger_id: trigger.id,
      };

      const res = await insertRunWithDueEvent(supabase, {
        farmId: params.farmId,
        cycleId: params.cycleId,
        scopeId: a.scope_id,
        sopDefinitionId: a.sop_definition_id,
        triggerId: trigger.id,
        assignmentId: a.id,
        anchorDate: evaluated.anchorDate,
        dueAt: evaluated.dueAt,
        dueWindowStart: evaluated.dueWindowStart,
        dueWindowEnd: evaluated.dueWindowEnd,
        priority,
        reasonText: evaluated.reasonText,
        triggerSnapshot: snap,
        sourceEventId: null,
      });

      if (res) {
        created += 1;
        materializedTriggerIds.add(trigger.id);
      }
    }
  }

  const overdueUpdated = await applySopOverdueForCycle(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    now,
  });

  await refreshSopComplianceForDay(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    onDate: params.anchorDate,
  });

  return {
    created,
    skippedTriggers: skippedIneligible + evalNoMatch,
    skippedIneligible,
    evalNoMatch,
    overdueUpdated,
    complianceRefreshed: true,
  };
}

/** Client entry: resolves farm TZ + anchor day; optional scopeId is validated, not a run filter. */
export async function materializeSopRunsForScopeDay(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId?: string | null;
    anchorDate?: string;
    timezone?: string;
    now?: Date;
  }
): Promise<MaterializeResult & { anchorDate: string; timezone: string }> {
  let tz = params.timezone?.trim() || '';
  if (!tz) {
    const { data: farm, error } = await supabase
      .from('farms')
      .select('timezone')
      .eq('id', params.farmId)
      .maybeSingle();
    if (error) throw error;
    if (!farm) throw new Error('farm_not_found');
    tz = (farm as { timezone?: string }).timezone ?? 'UTC';
  }

  let anchorDate = params.anchorDate?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
    anchorDate = farmLocalDateString(tz, params.now);
  }

  if (params.scopeId) {
    const { data: scope, error: sErr } = await supabase
      .from('scopes')
      .select('id, farm_id, cycle_id')
      .eq('id', params.scopeId)
      .eq('farm_id', params.farmId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!scope?.id) throw new Error('scope_not_found');
    const scopeCycleId = (scope as { cycle_id?: string | null }).cycle_id;
    if (scopeCycleId != null && scopeCycleId !== params.cycleId) {
      throw new Error('scope_not_in_cycle');
    }
  }

  const result = await materializeSopRunsForDay(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    anchorDate,
    timezone: tz,
    now: params.now,
  });
  return { ...result, anchorDate, timezone: tz };
}

/**
 * Event-based: duplicate (farm, trigger, source_event) prevented by DB partial unique index.
 */
export async function createSopRunFromSourceEvent(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
    sopDefinitionId: string;
    triggerId: string;
    assignmentId: string | null;
    sourceEventId: string;
    dueAt: string | null;
    dueWindowStart: string | null;
    dueWindowEnd: string | null;
    reasonText: string;
  }
): Promise<{ runId: string } | null> {
  const { data: def, error: dErr } = await supabase
    .from('sop_definitions')
    .select('id, active, criticality, severity_if_missed')
    .eq('id', params.sopDefinitionId)
    .single();
  if (dErr) throw dErr;
  const definition = def as DefinitionLite | null;
  if (!definition?.active) return null;

  const now = new Date();
  const isOverdue = isRunPastDue(now, { due_at: params.dueAt, due_window_end: params.dueWindowEnd });
  const priority = computeRunPriority({
    criticality: definition.criticality,
    severity_if_missed: definition.severity_if_missed,
    isOverdue,
  });

  return insertRunWithDueEvent(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    sopDefinitionId: params.sopDefinitionId,
    triggerId: params.triggerId,
    assignmentId: params.assignmentId,
    anchorDate: null,
    dueAt: params.dueAt,
    dueWindowStart: params.dueWindowStart,
    dueWindowEnd: params.dueWindowEnd,
    priority,
    reasonText: params.reasonText,
    triggerSnapshot: {
      trigger_type: 'event_based',
      source_event_id: params.sourceEventId,
      farm_id: params.farmId,
    },
    sourceEventId: params.sourceEventId,
  });
}
