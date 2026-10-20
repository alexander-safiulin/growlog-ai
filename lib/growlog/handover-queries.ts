import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, format } from 'date-fns';

export type HandoverPack = {
  activeBatches: Array<{
    id: string;
    name: string;
    batch_code: string | null;
    stage: string;
    status: string;
  }>;
  workToday: Array<{ id: string; title: string; status: string; due_at: string | null }>;
  workWeek: Array<{ id: string; title: string; status: string; due_at: string | null }>;
  activeSops: Array<{ id: string; title: string; revision_version: number | null }>;
  openDeviations: Array<{ id: string; title: string; severity: string; status: string }>;
  recentReadings: Array<{ metric_code: string; value: number; captured_at: string }>;
  escalationContacts: Array<{ severity: string; role: string; user_id?: string }>;
  equipmentAttention: Array<{ id: string; name: string; next_service_due: string | null }>;
  autonomy: {
    openCriticalDeviations: number;
    overdueSopRuns: number;
    score: number;
  };
};

export async function fetchHandoverPack(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string | null; timezone: string; today: string }
): Promise<HandoverPack> {
  const { farmId, cycleId, today } = params;
  const weekEnd = format(addDays(new Date(`${today}T12:00:00`), 7), 'yyyy-MM-dd');

  const { data: cycles } = await supabase
    .from('grow_cycles')
    .select('id, name, batch_code, stage, status')
    .eq('farm_id', farmId)
    .in('status', ['active', 'planned'])
    .order('start_date', { ascending: false });

  let workTodayQ = supabase
    .from('sop_runs')
    .select('id, status, due_at, sop_definition_id')
    .eq('farm_id', farmId)
    .in('status', ['open', 'acknowledged', 'overdue'])
    .gte('anchor_date', today)
    .lte('anchor_date', today);
  if (cycleId) workTodayQ = workTodayQ.eq('cycle_id', cycleId);
  const { data: runsToday } = await workTodayQ;

  let workWeekQ = supabase
    .from('sop_runs')
    .select('id, status, due_at, sop_definition_id, anchor_date')
    .eq('farm_id', farmId)
    .in('status', ['open', 'acknowledged', 'overdue'])
    .gte('anchor_date', today)
    .lte('anchor_date', weekEnd);
  if (cycleId) workWeekQ = workWeekQ.eq('cycle_id', cycleId);
  const { data: runsWeek } = await workWeekQ;

  const defIds = [
    ...new Set(
      [...(runsToday ?? []), ...(runsWeek ?? [])].map((r) => r.sop_definition_id as string)
    ),
  ];
  const { data: defs } = defIds.length
    ? await supabase.from('sop_definitions').select('id, title').in('id', defIds)
    : { data: [] };
  const defTitle = new Map((defs ?? []).map((d) => [d.id as string, d.title as string]));

  const mapRun = (r: { id: string; status: string; due_at: string | null; sop_definition_id: string }) => ({
    id: r.id,
    title: defTitle.get(r.sop_definition_id) ?? 'SOP',
    status: r.status,
    due_at: r.due_at,
  });

  const { data: sopDefs } = await supabase
    .from('sop_definitions')
    .select('id, title, current_revision_id')
    .eq('farm_id', farmId)
    .eq('active', true);

  const revisionIds = (sopDefs ?? [])
    .map((d) => d.current_revision_id)
    .filter(Boolean) as string[];
  const { data: revisions } = revisionIds.length
    ? await supabase.from('sop_revisions').select('id, version').in('id', revisionIds)
    : { data: [] };
  const revVersion = new Map((revisions ?? []).map((r) => [r.id as string, r.version as number]));

  const { data: deviations } = await supabase
    .from('deviations')
    .select('id, title, severity, status')
    .eq('farm_id', farmId)
    .neq('status', 'closed')
    .order('detected_at', { ascending: false })
    .limit(20);

  let readingsQ = supabase
    .from('sensor_readings')
    .select('value_numeric, captured_at, metric_id')
    .eq('farm_id', farmId)
    .order('captured_at', { ascending: false })
    .limit(10);
  if (cycleId) readingsQ = readingsQ.eq('cycle_id', cycleId);
  const { data: readings } = await readingsQ;

  const metricIds = [...new Set((readings ?? []).map((r) => r.metric_id as string))];
  const { data: metrics } = metricIds.length
    ? await supabase.from('sensor_metrics').select('id, metric_code').in('id', metricIds)
    : { data: [] };
  const metricCode = new Map((metrics ?? []).map((m) => [m.id as string, m.metric_code as string]));

  const { data: farm } = await supabase
    .from('farms')
    .select('settings')
    .eq('id', farmId)
    .maybeSingle();
  const settings = (farm?.settings as Record<string, unknown> | null) ?? {};
  const matrix = Array.isArray(settings.escalation_matrix)
    ? (settings.escalation_matrix as Array<{ severity: string; role: string; user_id?: string }>)
    : [
        { severity: 'critical', role: 'manager' },
        { severity: 'high', role: 'manager' },
        { severity: 'medium', role: 'grower' },
      ];

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, next_service_due')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .not('next_service_due', 'is', null)
    .lte('next_service_due', new Date().toISOString())
    .limit(10);

  const overdueSop = (runsWeek ?? []).filter((r) => r.status === 'overdue').length;
  const openCritical = (deviations ?? []).filter((d) => d.severity === 'critical').length;
  const score = Math.max(0, 100 - openCritical * 25 - overdueSop * 5);

  return {
    activeBatches: (cycles ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      batch_code: (c.batch_code as string | null) ?? null,
      stage: c.stage as string,
      status: c.status as string,
    })),
    workToday: (runsToday ?? []).map(mapRun),
    workWeek: (runsWeek ?? []).map(mapRun),
    activeSops: (sopDefs ?? []).map((d) => ({
      id: d.id as string,
      title: d.title as string,
      revision_version: d.current_revision_id
        ? (revVersion.get(d.current_revision_id as string) ?? null)
        : null,
    })),
    openDeviations: (deviations ?? []).map((d) => ({
      id: d.id as string,
      title: d.title as string,
      severity: d.severity as string,
      status: d.status as string,
    })),
    recentReadings: (readings ?? []).map((r) => ({
      metric_code: metricCode.get(r.metric_id as string) ?? 'unknown',
      value: Number(r.value_numeric),
      captured_at: r.captured_at as string,
    })),
    escalationContacts: matrix,
    equipmentAttention: (equipment ?? []).map((e) => ({
      id: e.id as string,
      name: e.name as string,
      next_service_due: (e.next_service_due as string | null) ?? null,
    })),
    autonomy: {
      openCriticalDeviations: openCritical,
      overdueSopRuns: overdueSop,
      score,
    },
  };
}
