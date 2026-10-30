import type { SupabaseClient } from '@supabase/supabase-js';
import { buildLeafJournalContext, type LeafJournalContext } from '@growlog/domain';

const WINDOW_DAYS = 14;

export async function fetchLeafJournalContext(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string | null; scopeId: string | null },
): Promise<LeafJournalContext> {
  const to = new Date();
  const from = new Date(to.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let eventsQ = supabase
    .from('events')
    .select('event_type, occurred_at, title, body')
    .eq('farm_id', params.farmId)
    .in('event_type', ['feeding', 'watering'])
    .gte('occurred_at', from.toISOString())
    .lte('occurred_at', to.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(40);
  if (params.cycleId) eventsQ = eventsQ.eq('cycle_id', params.cycleId);
  if (params.scopeId) eventsQ = eventsQ.eq('scope_id', params.scopeId);

  let readingsQ = supabase
    .from('sensor_readings')
    .select('captured_at, value_numeric, sensor_metrics ( metric_code )')
    .eq('farm_id', params.farmId)
    .gte('captured_at', from.toISOString())
    .lte('captured_at', to.toISOString())
    .order('captured_at', { ascending: false })
    .limit(80);
  if (params.cycleId) readingsQ = readingsQ.eq('cycle_id', params.cycleId);
  if (params.scopeId) readingsQ = readingsQ.eq('scope_id', params.scopeId);

  const [eventsRes, readingsRes] = await Promise.all([eventsQ, readingsQ]);
  if (eventsRes.error) throw eventsRes.error;
  if (readingsRes.error) throw readingsRes.error;

  const recentEvents = (eventsRes.data ?? []).map((e) => ({
    eventType: String(e.event_type),
    occurredAt: String(e.occurred_at),
    title: e.title as string | null,
    body: e.body as string | null,
  }));

  const sensorReadings = (readingsRes.data ?? []).flatMap((r) => {
    const sm = r.sensor_metrics as { metric_code?: string } | { metric_code?: string }[] | null;
    const code = Array.isArray(sm) ? sm[0]?.metric_code : sm?.metric_code;
    if (!code || r.value_numeric == null) return [];
    return [
      {
        metricCode: code,
        value: Number(r.value_numeric),
        recordedAt: String(r.captured_at),
      },
    ];
  });

  return buildLeafJournalContext({ sensorReadings, recentEvents });
}
