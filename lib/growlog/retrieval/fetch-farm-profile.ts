import type { SupabaseClient } from '@supabase/supabase-js';

export type FarmProfileBlock = {
  farmId: string;
  name: string;
  city: string | null;
  country: string | null;
  timezone: string;
  scopes: { id: string; displayName: string; cycleId: string | null; active: boolean }[];
  activeCycles: { id: string; name: string; stage: string; status: string }[];
};

export async function fetchFarmProfile(
  supabase: SupabaseClient,
  farmId: string
): Promise<FarmProfileBlock> {
  const { data: farm, error: fErr } = await supabase
    .from('farms')
    .select('id, name, city, country, timezone')
    .eq('id', farmId)
    .maybeSingle();
  if (fErr) throw fErr;
  if (!farm) {
    return {
      farmId,
      name: 'Farm',
      city: null,
      country: null,
      timezone: 'UTC',
      scopes: [],
      activeCycles: [],
    };
  }

  const [scopesRes, cyclesRes] = await Promise.all([
    supabase
      .from('scopes')
      .select('id, display_name, cycle_id, active')
      .eq('farm_id', farmId)
      .order('display_name')
      .limit(40),
    supabase
      .from('grow_cycles')
      .select('id, name, stage, status')
      .eq('farm_id', farmId)
      .in('status', ['active', 'planning'])
      .order('start_date', { ascending: false })
      .limit(12),
  ]);
  if (scopesRes.error) throw scopesRes.error;
  if (cyclesRes.error) throw cyclesRes.error;

  return {
    farmId: farm.id as string,
    name: farm.name as string,
    city: (farm.city as string | null) ?? null,
    country: (farm.country as string | null) ?? null,
    timezone: (farm.timezone as string) ?? 'UTC',
    scopes: (scopesRes.data ?? []).map((s) => ({
      id: s.id as string,
      displayName: (s.display_name as string) ?? 'Scope',
      cycleId: (s.cycle_id as string | null) ?? null,
      active: Boolean(s.active),
    })),
    activeCycles: (cyclesRes.data ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      stage: c.stage as string,
      status: c.status as string,
    })),
  };
}
