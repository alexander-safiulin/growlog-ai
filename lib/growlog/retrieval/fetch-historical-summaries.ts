import type { SupabaseClient } from '@supabase/supabase-js';

export type HistoricalCycleSummary = {
  cycleId: string;
  name: string;
  cultivarName: string | null;
  stage: string;
  status: string;
  startDate: string;
  endDate: string | null;
  anomalyCounts: Record<string, number>;
  feedingCount: number;
  harvestWetKg: number | null;
};

const ANOMALY_TYPES = ['issue_detected', 'pest_detected', 'deficiency_suspected', 'anomaly'];

export async function fetchHistoricalCycleSummaries(
  supabase: SupabaseClient,
  params: { farmId: string; currentCycleId: string | null; limit?: number }
): Promise<HistoricalCycleSummary[]> {
  const limit = params.limit ?? 5;
  let q = supabase
    .from('grow_cycles')
    .select('id, name, cultivar_name, stage, status, start_date, end_date')
    .eq('farm_id', params.farmId)
    .order('start_date', { ascending: false })
    .limit(limit + 3);
  const { data: cycles, error } = await q;
  if (error) throw error;

  const rows = (cycles ?? []).filter((c) => c.id !== params.currentCycleId).slice(0, limit);
  const out: HistoricalCycleSummary[] = [];

  for (const cycle of rows) {
    const cycleId = cycle.id as string;
    const { data: events } = await supabase
      .from('events')
      .select('event_type')
      .eq('farm_id', params.farmId)
      .eq('cycle_id', cycleId)
      .in('event_type', ANOMALY_TYPES);
    const anomalyCounts: Record<string, number> = {};
    for (const e of events ?? []) {
      const t = (e as { event_type: string }).event_type;
      anomalyCounts[t] = (anomalyCounts[t] ?? 0) + 1;
    }

    const { count: feedingCount } = await supabase
      .from('grow_cycle_feeding_entries')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', params.farmId)
      .eq('cycle_id', cycleId);

    const { data: harvest } = await supabase
      .from('harvest_records')
      .select('wet_weight_kg')
      .eq('farm_id', params.farmId)
      .eq('cycle_id', cycleId)
      .order('harvested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    out.push({
      cycleId,
      name: cycle.name as string,
      cultivarName: (cycle.cultivar_name as string | null) ?? null,
      stage: cycle.stage as string,
      status: cycle.status as string,
      startDate: cycle.start_date as string,
      endDate: (cycle.end_date as string | null) ?? null,
      anomalyCounts,
      feedingCount: feedingCount ?? 0,
      harvestWetKg: harvest?.wet_weight_kg != null ? Number(harvest.wet_weight_kg) : null,
    });
  }

  return out;
}

export async function fetchApprovedLessons(
  supabase: SupabaseClient,
  farmId: string,
  limit = 8
): Promise<{ id: string; title: string | null; excerpt: string }[]> {
  const { data, error } = await supabase
    .from('grow_memory_items')
    .select('id, title, body')
    .eq('farm_id', farmId)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string | null) ?? null,
    excerpt: String(r.body ?? '').slice(0, 360),
  }));
}
