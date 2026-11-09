import type { SupabaseClient } from '@supabase/supabase-js';

export type FeedingTrend7d = {
  entryCount: number;
  totalVolumeMl: number;
  avgPh: number | null;
  avgEcMs: number | null;
  phMin: number | null;
  phMax: number | null;
  ecMin: number | null;
  ecMax: number | null;
};

export async function fetchFeedingTrend7d(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; assembledToIso: string }
): Promise<FeedingTrend7d | null> {
  const to = new Date(params.assembledToIso);
  const from = new Date(to.getTime() - 7 * 86400000);

  const { data, error } = await supabase
    .from('grow_cycle_feeding_entries')
    .select('volume_ml, ph, ec_ms, created_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  const rows = data ?? [];
  if (!rows.length) return null;

  const phs: number[] = [];
  const ecs: number[] = [];
  let totalVol = 0;
  for (const r of rows) {
    totalVol += Number((r as { volume_ml: number }).volume_ml) || 0;
    const ph = (r as { ph: number | null }).ph;
    const ec = (r as { ec_ms: number | null }).ec_ms;
    if (ph != null) phs.push(Number(ph));
    if (ec != null) ecs.push(Number(ec));
  }

  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null;

  return {
    entryCount: rows.length,
    totalVolumeMl: Math.round(totalVol),
    avgPh: avg(phs),
    avgEcMs: avg(ecs),
    phMin: phs.length ? Math.min(...phs) : null,
    phMax: phs.length ? Math.max(...phs) : null,
    ecMin: ecs.length ? Math.min(...ecs) : null,
    ecMax: ecs.length ? Math.max(...ecs) : null,
  };
}
