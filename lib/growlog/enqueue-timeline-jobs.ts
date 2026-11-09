import type { SupabaseClient } from '@supabase/supabase-js';

function farmLocalDateIso(timezone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Service-role path: mirrors SQL enqueue_standard_event_jobs without auth RPC. */
export async function enqueueTimelineJobsForEvent(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    scopeId: string | null;
    eventId: string;
    occurredAt: string;
    priority?: string;
  }
): Promise<void> {
  const { data: farm } = await supabase
    .from('farms')
    .select('timezone')
    .eq('id', params.farmId)
    .maybeSingle();
  const tz = (farm as { timezone?: string } | null)?.timezone ?? 'UTC';
  const localDate = farmLocalDateIso(tz, new Date(params.occurredAt));
  const priority = params.priority ?? 'normal';
  const scheduledFor = new Date().toISOString();

  const rows = [
    {
      job_type: 'document.index',
      dedup_key: `document.index:event:${params.eventId}`,
      payload_json: { doc_type: 'event', source_id: params.eventId },
      entity_type: 'event',
    },
    {
      job_type: 'timeline.daily.refresh',
      dedup_key: `timeline.daily.refresh:${params.scopeId}:${localDate}`,
      payload_json: { timeline_date: localDate, event_id: params.eventId },
      entity_type: 'event',
    },
    {
      job_type: 'focus.refresh',
      dedup_key: `focus.refresh:${params.scopeId}:${localDate}`,
      payload_json: { focus_date: localDate, event_id: params.eventId },
      entity_type: 'event',
    },
  ];

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('background_jobs')
      .select('id')
      .eq('farm_id', params.farmId)
      .eq('dedup_key', row.dedup_key)
      .in('status', ['pending', 'running', 'retrying'])
      .limit(1);
    if (existing?.length) continue;

    const { error } = await supabase.from('background_jobs').insert({
      job_type: row.job_type,
      status: 'pending',
      priority,
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      entity_type: row.entity_type,
      entity_id: params.eventId,
      scheduled_for: scheduledFor,
      dedup_key: row.dedup_key,
      correlation_id: params.eventId,
      payload_json: row.payload_json,
    });
    if (error) throw error;
  }
}
