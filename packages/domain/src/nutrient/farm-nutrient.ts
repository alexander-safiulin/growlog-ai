import type { SupabaseClient } from '@supabase/supabase-js';
import type { SolveForwardResult } from '@growlog/nutrient-calc';
import { createLogEntry } from '../growlog/mutations';

export type NutrientSolutionKind = 'recipe' | 'stock' | 'working';

export interface FarmWaterProfileRow {
  id: string;
  farm_id: string;
  name: string;
  water_ppm: Record<string, number>;
  alkalinity_hco3_ppm: number | null;
  metadata: Record<string, unknown>;
}

export interface FarmFertilizerRow {
  id: string;
  farm_id: string;
  external_key: string;
  brand: string;
  name: string;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  density_g_per_ml: number | null;
  label_basis: 'w_w' | 'w_v' | null;
  metadata: Record<string, unknown>;
}

export interface NutrientFavoriteRow {
  id: string;
  farm_id: string;
  user_id: string;
  product_scope: 'catalog' | 'farm';
  catalog_product_id: string | null;
  farm_product_id: string | null;
}

export async function listFarmWaterProfiles(
  supabase: SupabaseClient,
  farmId: string,
): Promise<FarmWaterProfileRow[]> {
  const { data, error } = await supabase
    .from('farm_water_profiles')
    .select('*')
    .eq('farm_id', farmId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as FarmWaterProfileRow[];
}

export async function upsertFarmWaterProfile(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    id?: string;
    name: string;
    waterPpm: Record<string, number>;
    alkalinityHco3Ppm?: number | null;
    userId?: string | null;
  },
): Promise<FarmWaterProfileRow> {
  const row = {
    farm_id: params.farmId,
    name: params.name,
    water_ppm: params.waterPpm,
    alkalinity_hco3_ppm: params.alkalinityHco3Ppm ?? null,
    created_by: params.userId ?? null,
  };
  if (params.id) {
    const { data, error } = await supabase
      .from('farm_water_profiles')
      .update(row)
      .eq('id', params.id)
      .eq('farm_id', params.farmId)
      .select('*')
      .single();
    if (error) throw error;
    return data as FarmWaterProfileRow;
  }
  const { data, error } = await supabase.from('farm_water_profiles').insert(row).select('*').single();
  if (error) throw error;
  return data as FarmWaterProfileRow;
}

export async function listFarmFertilizers(
  supabase: SupabaseClient,
  farmId: string,
): Promise<FarmFertilizerRow[]> {
  const { data, error } = await supabase
    .from('farm_fertilizer_products')
    .select('*')
    .eq('farm_id', farmId)
    .order('brand')
    .order('name');
  if (error) throw error;
  return (data ?? []) as FarmFertilizerRow[];
}

export async function listNutrientFavorites(
  supabase: SupabaseClient,
  farmId: string,
  userId: string,
): Promise<NutrientFavoriteRow[]> {
  const { data, error } = await supabase
    .from('farm_nutrient_favorites')
    .select('*')
    .eq('farm_id', farmId)
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as NutrientFavoriteRow[];
}

export async function toggleNutrientFavorite(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    userId: string;
    productScope: 'catalog' | 'farm';
    catalogProductId?: string;
    farmProductId?: string;
    favorited: boolean;
  },
): Promise<void> {
  const filter =
    params.productScope === 'catalog'
      ? { catalog_product_id: params.catalogProductId, farm_product_id: null }
      : { farm_product_id: params.farmProductId, catalog_product_id: null };

  if (!params.favorited) {
    const { error } = await supabase
      .from('farm_nutrient_favorites')
      .delete()
      .eq('farm_id', params.farmId)
      .eq('user_id', params.userId)
      .match(filter);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('farm_nutrient_favorites').insert({
    farm_id: params.farmId,
    user_id: params.userId,
    product_scope: params.productScope,
    ...filter,
  });
  if (error) throw error;
}

export async function listFarmNutrientRecipes(
  supabase: SupabaseClient,
  farmId: string,
  solutionKind?: NutrientSolutionKind,
) {
  let q = supabase.from('nutrient_recipes').select('*').eq('farm_id', farmId).order('updated_at', {
    ascending: false,
  });
  if (solutionKind) q = q.eq('solution_kind', solutionKind);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function saveNutrientRecipeWithMeta(
  supabase: SupabaseClient,
  input: {
    farmId: string;
    name: string;
    volumeL: number;
    solutionKind: NutrientSolutionKind;
    cycleId?: string | null;
    scopeId?: string | null;
    targetProfileId?: string | null;
    feedScheduleId?: string | null;
    parentRecipeId?: string | null;
    inputs: Record<string, unknown>;
    result: SolveForwardResult;
    solverVersion: string;
  },
): Promise<{ id: string }> {
  const { data: recipe, error } = await supabase
    .from('nutrient_recipes')
    .insert({
      farm_id: input.farmId,
      name: input.name,
      volume_l: input.volumeL,
      solution_kind: input.solutionKind,
      cycle_id: input.cycleId ?? null,
      scope_id: input.scopeId ?? null,
      target_profile_id: input.targetProfileId ?? null,
      feed_schedule_id: input.feedScheduleId ?? null,
      parent_recipe_id: input.parentRecipeId ?? null,
      mode: 'forward',
      inputs: input.inputs,
      result: input.result as unknown as Record<string, unknown>,
      solver_version: input.solverVersion,
    })
    .select('id')
    .single();
  if (error) throw error;

  const doses = input.result.best.doses.map((d) => ({
    recipe_id: recipe.id,
    fertilizer_product_id: d.fertilizerId,
    fertilizer_label: d.fertilizerName,
    dose_per_l: d.amountPerL,
    unit: d.unit,
    tank: d.tank ?? 'single',
  }));

  if (doses.length > 0) {
    const { error: doseErr } = await supabase.from('nutrient_recipe_doses').insert(doses);
    if (doseErr) throw doseErr;
  }

  return { id: recipe.id };
}

export async function logFeedingFromNutrientRecipe(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    recipeId: string;
    recipeName: string;
    volumeL: number;
    userId?: string | null;
  },
): Promise<{ eventId: string }> {
  const body = `Nutrient mix: ${params.recipeName} (${params.volumeL} L)`;
  const { event } = await createLogEntry(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    eventType: 'feeding',
    body,
    occurredAt: new Date().toISOString(),
    sourceType: 'user_text',
    createdBy: params.userId ?? null,
    payload: {
      nutrient_recipe_id: params.recipeId,
      volume_l: params.volumeL,
    },
  });

  const eventId = String((event as { id: string }).id);
  const { error } = await supabase
    .from('nutrient_recipes')
    .update({ linked_event_id: eventId })
    .eq('id', params.recipeId)
    .eq('farm_id', params.farmId);
  if (error) throw error;

  return { eventId };
}
