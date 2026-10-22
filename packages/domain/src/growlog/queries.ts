import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventRow, Farm, GrowCycle, Scope, SensorMetric } from '../types/database';

export async function fetchFarms(supabase: SupabaseClient): Promise<Farm[]> {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Farm[];
}

export async function fetchFarmMemberDisplayNames(
  supabase: SupabaseClient,
  farmId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('farm_users')
    .select('user_id, display_name')
    .eq('farm_id', farmId);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const uid = String((row as { user_id: string }).user_id);
    const name = (row as { display_name: string | null }).display_name;
    map[uid] = name?.trim() || uid.slice(0, 8);
  }
  return map;
}

export async function fetchGrowCyclesForFarm(
  supabase: SupabaseClient,
  farmId: string,
  limit = 30,
): Promise<Array<Pick<GrowCycle, 'id' | 'name' | 'status' | 'start_date'>>> {
  const { data, error } = await supabase
    .from('grow_cycles')
    .select('id, name, status, start_date')
    .eq('farm_id', farmId)
    .order('start_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<Pick<GrowCycle, 'id' | 'name' | 'status' | 'start_date'>>;
}

export async function fetchEventsByIds(
  supabase: SupabaseClient,
  farmId: string,
  eventIds: string[],
): Promise<Array<Pick<EventRow, 'id' | 'body' | 'occurred_at' | 'event_type'>>> {
  if (!eventIds.length) return [];
  const { data, error } = await supabase
    .from('events')
    .select('id, body, occurred_at, event_type')
    .eq('farm_id', farmId)
    .in('id', eventIds);
  if (error) throw error;
  return (data ?? []) as Array<Pick<EventRow, 'id' | 'body' | 'occurred_at' | 'event_type'>>;
}

export async function fetchActiveCycle(
  supabase: SupabaseClient,
  farmId: string
): Promise<GrowCycle | null> {
  const { data, error } = await supabase
    .from('grow_cycles')
    .select('*')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as GrowCycle | null;
}

export async function fetchScopesForCycle(
  supabase: SupabaseClient,
  cycleId: string
): Promise<Scope[]> {
  const { data, error } = await supabase
    .from('scopes')
    .select('*')
    .eq('cycle_id', cycleId)
    .eq('active', true)
    .order('display_name');
  if (error) throw error;
  return (data ?? []) as Scope[];
}

export async function fetchRecentEvents(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; limit?: number }
): Promise<EventRow[]> {
  const { farmId, cycleId, limit = 50 } = params;
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload, created_at'
    )
    .eq('farm_id', farmId)
    .eq('cycle_id', cycleId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function fetchGlobalSensorMetrics(
  supabase: SupabaseClient
): Promise<SensorMetric[]> {
  const { data, error } = await supabase
    .from('sensor_metrics')
    .select('id, farm_id, metric_code, name, unit, category')
    .is('farm_id', null)
    .order('metric_code');
  if (error) throw error;
  return (data ?? []) as SensorMetric[];
}

export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
