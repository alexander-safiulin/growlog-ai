import type { SupabaseClient } from '@supabase/supabase-js';
import { checkThresholdViolations } from '@/lib/growlog/deviation-engine';
import { enqueueTimelineJobsForEvent } from '@/lib/growlog/enqueue-timeline-jobs';

export async function maybePublishSensorThresholdAnomaly(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    scopeId: string | null;
    metricId: string;
    metricCode: string;
    value: number;
    capturedAt: string;
  }
): Promise<string | null> {
  let cycleStage: string | null = null;
  if (params.cycleId) {
    const { data: cycle } = await supabase
      .from('grow_cycles')
      .select('stage')
      .eq('id', params.cycleId)
      .maybeSingle();
    cycleStage = (cycle as { stage?: string } | null)?.stage ?? null;
  }

  const deviationId = await checkThresholdViolations(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    metricCode: params.metricCode,
    value: params.value,
    cycleStage,
  });
  if (!deviationId) return null;

  const day = params.capturedAt.slice(0, 10);
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('event_type', 'anomaly')
    .gte('occurred_at', `${day}T00:00:00.000Z`)
    .contains('payload', { metric_code: params.metricCode, deviation_id: deviationId })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const body = `Порог ${params.metricCode}: ${params.value}`;
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      event_type: 'anomaly',
      title: 'Sensor threshold',
      body,
      occurred_at: params.capturedAt,
      source_type: 'internal_system',
      payload: {
        metric_id: params.metricId,
        metric_code: params.metricCode,
        value: params.value,
        deviation_id: deviationId,
        auto: true,
      },
      created_by: null,
    })
    .select('id')
    .single();
  if (error) throw error;

  await enqueueTimelineJobsForEvent(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    eventId: event.id as string,
    occurredAt: params.capturedAt,
    priority: 'high',
  });

  return event.id as string;
}
