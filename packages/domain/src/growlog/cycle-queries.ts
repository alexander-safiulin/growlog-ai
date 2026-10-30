import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventRow } from '../types/database';
import { monthUtcBoundsForFarmMonth } from './cycle-calendar';

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

export async function fetchJournalRecipePrefillId(
  supabase: SupabaseClient,
  params: {
    cycleId: string;
    stage: string;
    localHint?: { recipeId: string | null; weekLabel: string | null } | null;
  },
): Promise<string | null> {
  if (params.localHint?.recipeId) return params.localHint.recipeId;
  const planHint = await fetchNutrientPlanStepRecipeHint(supabase, params.cycleId);
  if (planHint?.recipeId) return planHint.recipeId;
  const stageLink = await fetchCycleStageRecipeForStage(supabase, params.cycleId, params.stage);
  return stageLink?.recipe_id ?? null;
}

export async function fetchNutrientPlanStepRecipeHint(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<{ recipeId: string | null; weekLabel: string | null } | null> {
  const { data: plan, error: planErr } = await supabase
    .from('grow_cycle_nutrient_plans')
    .select('active_step_id')
    .eq('cycle_id', cycleId)
    .maybeSingle();
  if (planErr) throw planErr;
  if (!plan?.active_step_id) return null;
  const { data: step, error: stepErr } = await supabase
    .from('farm_feed_system_steps')
    .select('recipe_id, week_label')
    .eq('id', plan.active_step_id as string)
    .maybeSingle();
  if (stepErr) throw stepErr;
  if (!step) return null;
  return {
    recipeId: (step.recipe_id as string | null) ?? null,
    weekLabel: (step.week_label as string | null) ?? null,
  };
}

export async function fetchNutrientRecipeRow(
  supabase: SupabaseClient,
  farmId: string,
  recipeId: string,
): Promise<{
  id: string;
  name: string | null;
  volume_l: number | null;
  solution_kind: string | null;
  result: Record<string, unknown>;
  inputs: Record<string, unknown>;
} | null> {
  const { data, error } = await supabase
    .from('nutrient_recipes')
    .select('id, name, volume_l, solution_kind, result, inputs')
    .eq('farm_id', farmId)
    .eq('id', recipeId)
    .maybeSingle();
  if (error) throw error;
  return data as {
    id: string;
    name: string | null;
    volume_l: number | null;
    solution_kind: string | null;
    result: Record<string, unknown>;
    inputs: Record<string, unknown>;
  } | null;
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

export type HarvestRecordRow = {
  id: string;
  harvested_at: string;
  wet_weight_kg: number | null;
  dry_weight_kg: number | null;
  notes: string | null;
};

export async function fetchCycleHarvestRecord(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<HarvestRecordRow | null> {
  const { data, error } = await supabase
    .from('harvest_records')
    .select('id, harvested_at, wet_weight_kg, dry_weight_kg, notes')
    .eq('cycle_id', cycleId)
    .order('harvested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as HarvestRecordRow | null;
}

export async function fetchCycleEventsInRange(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; fromIso: string; toIso: string },
): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload, created_at',
    )
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .gte('occurred_at', params.fromIso)
    .lt('occurred_at', params.toIso)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function fetchCycleCalendarEvents(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; fromIso: string; toIso: string },
) {
  const { data, error } = await supabase
    .from('events')
    .select('id, event_type, occurred_at, body, payload')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .gte('occurred_at', params.fromIso)
    .lt('occurred_at', params.toIso)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    event_type: string;
    occurred_at: string;
    body: string | null;
    payload: Record<string, unknown> | null;
  }>;
}

export async function fetchCycleFeedingRowsForRange(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; fromIso: string; toIso: string },
) {
  const { data: eventRows, error: evErr } = await supabase
    .from('events')
    .select('id, occurred_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('event_type', ['watering', 'feeding'])
    .gte('occurred_at', params.fromIso)
    .lt('occurred_at', params.toIso);
  if (evErr) throw evErr;
  const eventMap = new Map(
    (eventRows ?? []).map((e) => [e.id as string, e.occurred_at as string]),
  );
  const eventIds = [...eventMap.keys()];
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from('grow_cycle_feeding_entries')
    .select(
      `
      id,
      entry_kind,
      volume_ml,
      ph,
      ec_ms,
      air_temp_c,
      air_rh_pct,
      comment,
      recipe_id,
      event_id,
      nutrient_recipes ( name ),
      grow_cycle_feeding_entry_doses (
        product_label,
        amount_ml,
        fertilizer_product_id,
        farm_fertilizer_product_id
      )
    `,
    )
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('event_id', eventIds);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const eventId = r.event_id as string;
    const occurred_at = eventMap.get(eventId) ?? new Date().toISOString();
    const recipe = r.nutrient_recipes as { name: string | null } | null;
    const doses = (r.grow_cycle_feeding_entry_doses ?? []) as Array<{
      product_label: string;
      amount_ml: number;
      fertilizer_product_id: string | null;
      farm_fertilizer_product_id: string | null;
    }>;
    return {
      event_id: eventId,
      occurred_at,
      entry_kind: r.entry_kind as 'watering' | 'feeding',
      volume_ml: Number(r.volume_ml),
      ph: r.ph != null ? Number(r.ph) : null,
      ec_ms: r.ec_ms != null ? Number(r.ec_ms) : null,
      air_temp_c: r.air_temp_c != null ? Number(r.air_temp_c) : null,
      air_rh_pct: r.air_rh_pct != null ? Number(r.air_rh_pct) : null,
      recipe_name: recipe?.name ?? null,
      comment: (r.comment as string | null) ?? null,
      doses,
    };
  });
}

export async function fetchCycleCalendarMonthBundle(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; year: number; month: number; timeZone: string },
) {
  const bounds = monthUtcBoundsForFarmMonth(params.year, params.month, params.timeZone);
  const [events, feedingRows, stageEvents] = await Promise.all([
    fetchCycleCalendarEvents(supabase, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      fromIso: bounds.fromIso,
      toIso: bounds.toIso,
    }),
    fetchCycleFeedingRowsForRange(supabase, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      fromIso: bounds.fromIso,
      toIso: bounds.toIso,
    }),
    fetchStageChangeEvents(supabase, { farmId: params.farmId, cycleId: params.cycleId }),
  ]);
  return { events, feedingRows, stageEvents, bounds };
}

export async function fetchCycleFeedingRowsAll(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string },
) {
  const { data, error } = await supabase
    .from('grow_cycle_feeding_entries')
    .select(
      `
      entry_kind,
      volume_ml,
      grow_cycle_feeding_entry_doses (
        product_label,
        amount_ml,
        fertilizer_product_id,
        farm_fertilizer_product_id
      )
    `,
    )
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const doses = (r.grow_cycle_feeding_entry_doses ?? []) as Array<{
      product_label: string;
      amount_ml: number;
      fertilizer_product_id: string | null;
      farm_fertilizer_product_id: string | null;
    }>;
    return {
      entry_kind: r.entry_kind as 'watering' | 'feeding',
      volume_ml: Number(r.volume_ml),
      doses,
    };
  });
}
