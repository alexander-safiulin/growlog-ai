import type { SupabaseClient } from '@supabase/supabase-js';
import { SOLVER_VERSION, type SolveForwardResult } from '@growlog/nutrient-calc';
import {
  applyGuestMergePlanWithExecutor,
  type GuestMergeApplyResult,
  type GuestMergePlan,
  type NutrientGuestStore,
} from '@growlog/domain';
import {
  saveFarmFeedSystem,
  saveFarmFertilizerProduct,
  saveNutrientRecipeWithMeta,
  toggleNutrientFavorite,
  upsertFarmWaterProfileFull,
} from '@growlog/domain';

export async function applyGuestMergePlan(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    userId: string;
    store: NutrientGuestStore;
    plan: GuestMergePlan;
  },
): Promise<GuestMergeApplyResult> {
  const { farmId, userId, store, plan } = params;

  return applyGuestMergePlanWithExecutor(store, farmId, plan, {
    upsertWater: async (w) => {
      await upsertFarmWaterProfileFull(supabase, {
        farmId,
        name: w.name,
        waterPpm: w.water_ppm,
        alkalinityHco3Ppm: w.alkalinity_hco3_ppm,
        ecMsCm: w.ec_ms_cm ?? null,
        ph: w.ph ?? null,
        userId,
      });
    },
    saveFertilizer: async (f) =>
      saveFarmFertilizerProduct(supabase, {
        farmId,
        userId,
        externalKey: f.external_key,
        brand: f.brand,
        name: f.name,
        physicalForm: f.physical_form,
        doseUnit: f.dose_unit,
        densityGPerMl: f.density_g_per_ml,
        labelBasis: f.label_basis,
        nTotalIncludesForms: Boolean(f.metadata?.n_total_includes_forms),
        metadata: f.metadata,
        matchExternalKey: true,
        lines: f.lines,
      }),
    saveFeedSystem: async (sys) => {
      await saveFarmFeedSystem(supabase, {
        farmId,
        userId,
        name: sys.name,
        notes: sys.notes,
        steps: sys.steps.map((step, idx) => ({
          step_order: step.step_order ?? idx + 1,
          week_label: step.week_label,
          stage: step.stage,
          target_ppm: step.target_ppm,
          ph_target: step.ph_target,
          ec_target_ms_cm: step.ec_target_ms_cm,
          light_hours: null,
          light_ppfd: null,
        })),
      });
    },
    saveRecipe: async (recipe) => {
      const result = recipe.inputs._solverResult as SolveForwardResult | undefined;
      if (!result) throw new Error('missing_solver_result');
      const inputs = { ...recipe.inputs };
      delete inputs._solverResult;
      await saveNutrientRecipeWithMeta(supabase, {
        farmId,
        userId,
        name: recipe.name,
        solutionKind: recipe.solution_kind,
        volumeL: recipe.volume_l,
        inputs,
        result,
        solverVersion: SOLVER_VERSION,
      });
    },
    toggleCatalogFavorite: async (catalogProductId) => {
      await toggleNutrientFavorite(supabase, {
        farmId,
        userId,
        productScope: 'catalog',
        catalogProductId,
        favorited: true,
      });
    },
    toggleFarmFavorite: async (farmProductId) => {
      await toggleNutrientFavorite(supabase, {
        farmId,
        userId,
        productScope: 'farm',
        farmProductId,
        favorited: true,
      });
    },
  });
}
