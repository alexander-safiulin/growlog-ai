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

  const { data: existing } = await supabase
    .from('deviations')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('source_event_id', params.eventId)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

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

  const { data: existing } = await supabase
    .from('deviations')
    .select('id')
    .eq('farm_id', params.farmId)
    .neq('status', 'closed')
    .filter('metadata->>threshold_id', 'eq', String(hit.id))
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

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

export async function createMissedSopDeviation(
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

export async function createPhotoDeviation(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    scopeId: string | null;
    mediaAssetId: string;
    summary: string | null;
    issues: unknown[];
  }
): Promise<string | null> {
  if (!params.issues.length || !params.cycleId) return null;
  const { data: prior } = await supabase
    .from('events')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('event_type', 'issue_detected')
    .contains('payload', { media_asset_id: params.mediaAssetId })
    .limit(1)
    .maybeSingle();
  if (prior?.id) return null;
  const note = params.issues
    .map((issue) => {
      if (!issue || typeof issue !== 'object') return '';
      const row = issue as { code?: string; note?: string };
      return [row.code, row.note].filter(Boolean).join(': ');
    })
    .filter(Boolean)
    .join('; ')
    .slice(0, 500);
  if (!note) return null;

  const body = `Photo analysis (unconfirmed model hypothesis): ${note}`;
  const { data: event, error: eErr } = await supabase
    .from('events')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      event_type: 'issue_detected',
      title: 'Photo issue hypothesis',
      body,
      occurred_at: new Date().toISOString(),
      source_type: 'ai_generated',
      payload: { media_asset_id: params.mediaAssetId, auto: true },
    })
    .select('id')
    .single();
  if (eErr) throw eErr;

  return maybeCreateDeviationFromEvent(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    eventId: event.id as string,
    eventType: 'issue_detected',
    title: 'Photo issue hypothesis',
    body: params.summary ? `${body}\n${params.summary}` : body,
  });
}
