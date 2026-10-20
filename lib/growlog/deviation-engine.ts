import type { SupabaseClient } from '@supabase/supabase-js';

const ISSUE_EVENTS = new Set([
  'issue_detected',
  'pest_detected',
  'deficiency_suspected',
  'anomaly',
]);

export async function maybeCreateDeviationFromEvent(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    scopeId: string | null;
    eventId: string;
    eventType: string;
    title: string | null;
    body: string | null;
  }
): Promise<string | null> {
  if (!ISSUE_EVENTS.has(params.eventType)) return null;

  const { data, error } = await supabase
    .from('deviations')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      source_event_id: params.eventId,
      title: params.title?.trim() || `Deviation: ${params.eventType}`,
      description: params.body,
      severity: params.eventType === 'pest_detected' ? 'high' : 'medium',
      status: 'open',
      metadata: { auto: true, event_type: params.eventType },
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data?.id as string) ?? null;
}

export async function checkThresholdViolations(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    scopeId: string | null;
    metricCode: string;
    value: number;
    cycleStage: string | null;
  }
): Promise<string | null> {
  let q = supabase
    .from('playbook_thresholds')
    .select('id, min_value, max_value, severity, metric_code')
    .eq('farm_id', params.farmId)
    .eq('status', 'approved')
    .eq('metric_code', params.metricCode);
  if (params.cycleStage) {
    q = q.or(`cycle_stage.eq.${params.cycleStage},cycle_stage.is.null`);
  }
  const { data: thresholds } = await q;
  const hit = (thresholds ?? []).find((t) => {
    const min = t.min_value != null ? Number(t.min_value) : null;
    const max = t.max_value != null ? Number(t.max_value) : null;
    if (min != null && params.value < min) return true;
    if (max != null && params.value > max) return true;
    return false;
  });
  if (!hit) return null;

  const { data, error } = await supabase
    .from('deviations')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      title: `Threshold: ${params.metricCode}=${params.value}`,
      description: `Playbook threshold violated (min=${hit.min_value ?? '—'}, max=${hit.max_value ?? '—'})`,
      severity: (hit.severity as string) ?? 'medium',
      status: 'open',
      metadata: { auto: true, threshold_id: hit.id, metric_code: params.metricCode },
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data?.id as string) ?? null;
}
