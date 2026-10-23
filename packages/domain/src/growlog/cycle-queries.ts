import type { SupabaseClient } from '@supabase/supabase-js';

export type FarmZoneRow = {
  id: string;
  farm_id: string;
  name: string;
  site_id: string | null;
};

export type GrowCycleStageRecipeRow = {
  id: string;
  farm_id: string;
  cycle_id: string;
  stage: string;
  recipe_id: string;
};

export type CycleStagePlanRow = {
  id: string;
  cycle_id: string;
  stage: string;
  planned_start: string | null;
  planned_end: string | null;
};

export async function fetchFarmZones(supabase: SupabaseClient, farmId: string): Promise<FarmZoneRow[]> {
  const { data, error } = await supabase
    .from('farm_zones')
    .select('id, farm_id, name, site_id')
    .eq('farm_id', farmId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as FarmZoneRow[];
}

export async function fetchCycleStageRecipeForStage(
  supabase: SupabaseClient,
  cycleId: string,
  stage: string,
): Promise<{ recipe_id: string } | null> {
  const { data, error } = await supabase
    .from('grow_cycle_stage_recipes')
    .select('recipe_id')
    .eq('cycle_id', cycleId)
    .eq('stage', stage)
    .maybeSingle();
  if (error) throw error;
  return data as { recipe_id: string } | null;
}

export type LightScheduleHistoryRow = {
  id: string;
  light_hours_on: number;
  light_hours_off: number;
  lights_on_at: string;
  effective_from: string;
};

export async function fetchLightScheduleHistory(
  supabase: SupabaseClient,
  cycleId: string,
  limit = 20,
): Promise<LightScheduleHistoryRow[]> {
  const { data, error } = await supabase
    .from('grow_cycle_light_schedules')
    .select('id, light_hours_on, light_hours_off, lights_on_at, effective_from')
    .eq('cycle_id', cycleId)
    .order('effective_from', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LightScheduleHistoryRow[];
}

export async function fetchCycleStageRecipes(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<GrowCycleStageRecipeRow[]> {
  const { data, error } = await supabase
    .from('grow_cycle_stage_recipes')
    .select('id, farm_id, cycle_id, stage, recipe_id')
    .eq('cycle_id', cycleId);
  if (error) throw error;
  return (data ?? []) as GrowCycleStageRecipeRow[];
}

export async function fetchCycleStagePlan(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<CycleStagePlanRow[]> {
  const { data, error } = await supabase
    .from('cycle_stage_plan')
    .select('id, cycle_id, stage, planned_start, planned_end')
    .eq('cycle_id', cycleId);
  if (error) throw error;
  return (data ?? []) as CycleStagePlanRow[];
}

export async function fetchFarmNutrientRecipes(
  supabase: SupabaseClient,
  farmId: string,
  limit = 100,
): Promise<Array<{ id: string; name: string | null; volume_l: number | null }>> {
  const { data, error } = await supabase
    .from('nutrient_recipes')
    .select('id, name, volume_l')
    .eq('farm_id', farmId)
    .is('cycle_id', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string | null; volume_l: number | null }>;
}

export async function fetchRecipeDoses(
  supabase: SupabaseClient,
  recipeId: string,
): Promise<
  Array<{
    id: string;
    fertilizer_label: string;
    dose_per_l: number;
    unit: string;
    fertilizer_product_id: string | null;
    farm_fertilizer_product_id: string | null;
  }>
> {
  const { data, error } = await supabase
    .from('nutrient_recipe_doses')
    .select(
      'id, fertilizer_label, dose_per_l, unit, fertilizer_product_id, farm_fertilizer_product_id',
    )
    .eq('recipe_id', recipeId);
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    fertilizer_label: string;
    dose_per_l: number;
    unit: string;
    fertilizer_product_id: string | null;
    farm_fertilizer_product_id: string | null;
  }>;
}

export async function upsertCycleStageRecipe(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; stage: string; recipeId: string },
) {
  const { data, error } = await supabase
    .from('grow_cycle_stage_recipes')
    .upsert(
      {
        farm_id: params.farmId,
        cycle_id: params.cycleId,
        stage: params.stage,
        recipe_id: params.recipeId,
      },
      { onConflict: 'cycle_id,stage' },
    )
    .select('id, stage, recipe_id')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchLastFeedingEvents(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string },
): Promise<{ lastWatering: string | null; lastFeeding: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .select('event_type, occurred_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('event_type', ['watering', 'feeding'])
    .order('occurred_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  let lastWatering: string | null = null;
  let lastFeeding: string | null = null;
  for (const row of data ?? []) {
    const t = row as { event_type: string; occurred_at: string };
    if (t.event_type === 'watering' && !lastWatering) lastWatering = t.occurred_at;
    if (t.event_type === 'feeding' && !lastFeeding) lastFeeding = t.occurred_at;
    if (lastWatering && lastFeeding) break;
  }
  return { lastWatering, lastFeeding };
}

export async function fetchStageChangeEvents(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string },
): Promise<Array<{ occurred_at: string; payload: Record<string, unknown> }>> {
  const { data, error } = await supabase
    .from('events')
    .select('occurred_at, payload')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('event_type', 'stage_changed')
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<{ occurred_at: string; payload: Record<string, unknown> }>;
}
