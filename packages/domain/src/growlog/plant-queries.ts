import type { SupabaseClient } from '@supabase/supabase-js';

export type CyclePlantRow = {
  id: string;
  farm_id: string;
  cycle_id: string | null;
  plant_code: string;
  cultivar_name: string | null;
  metadata: Record<string, unknown> | null;
};

export async function fetchPlantsForCycle(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string },
): Promise<CyclePlantRow[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('id, farm_id, cycle_id, plant_code, cultivar_name, metadata')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .order('plant_code', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CyclePlantRow[];
}

export async function fetchPlantForFarm(
  supabase: SupabaseClient,
  params: { farmId: string; plantId: string },
): Promise<CyclePlantRow | null> {
  const { data, error } = await supabase
    .from('plants')
    .select('id, farm_id, cycle_id, plant_code, cultivar_name, metadata')
    .eq('farm_id', params.farmId)
    .eq('id', params.plantId)
    .maybeSingle();
  if (error) throw error;
  return (data as CyclePlantRow | null) ?? null;
}

export function plantLabelNumber(plant: Pick<CyclePlantRow, 'metadata' | 'plant_code'>): string {
  const meta = plant.metadata ?? {};
  const fromMeta = meta.label_number;
  if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) {
    return String(fromMeta);
  }
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
  return plant.plant_code;
}
