import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function clearNutrientFavorites(
  supabase: SupabaseClient,
  farmId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('farm_nutrient_favorites')
    .delete()
    .eq('farm_id', farmId)
    .eq('user_id', userId);
  if (error) throw error;
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
  if (!params.favorited) {
    let q = supabase
      .from('farm_nutrient_favorites')
      .delete()
      .eq('farm_id', params.farmId)
      .eq('user_id', params.userId);
    if (params.productScope === 'catalog') {
      if (!params.catalogProductId) throw new Error('catalogProductId required');
      q = q.eq('catalog_product_id', params.catalogProductId).is('farm_product_id', null);
    } else {
      if (!params.farmProductId) throw new Error('farmProductId required');
      q = q.eq('farm_product_id', params.farmProductId).is('catalog_product_id', null);
    }
    const { error } = await q;
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('farm_nutrient_favorites').insert(
    params.productScope === 'catalog'
      ? {
          farm_id: params.farmId,
          user_id: params.userId,
          product_scope: 'catalog',
          catalog_product_id: params.catalogProductId,
          farm_product_id: null,
        }
      : {
          farm_id: params.farmId,
          user_id: params.userId,
          product_scope: 'farm',
          farm_product_id: params.farmProductId,
          catalog_product_id: null,
        },
  );
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

export type {
  FarmFeedSystemRow,
  FarmFeedSystemStepRow,
  GrowCycleNutrientPlanRow,
} from './farm-nutrient-crud';

export {
  deleteFarmWaterProfile,
  upsertFarmWaterProfileFull,
  listFarmFertilizerLines,
  saveFarmFertilizerProduct,
  deleteFarmFertilizerProduct,
  listFarmFeedSystems,
  listFarmFeedSystemSteps,
  saveFarmFeedSystem,
  deleteFarmFeedSystem,
  getGrowCycleNutrientPlan,
  setGrowCycleNutrientPlan,
  renameNutrientRecipe,
  deleteNutrientRecipe,
  copyGrowCycleNutrientPlan,
  markGrowCycleHarvested,
  duplicateNutrientRecipe,
  repeatNutrientRecipeInCycle,
  saveNutrientRecipeWithMeta,
  logFeedingFromNutrientRecipe,
} from './farm-nutrient-crud';
