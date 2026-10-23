import type { SupabaseClient } from '@supabase/supabase-js';
import { SOLVER_VERSION, type SolveForwardResult } from '@growlog/nutrient-calc';
import {
  buildGuestMergePlan,
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
): Promise<void> {
  const { farmId, userId, plan } = params;

  for (const w of plan.waterProfiles) {
    await upsertFarmWaterProfileFull(supabase, {
      farmId,
      name: w.name,
      waterPpm: w.water_ppm,
      alkalinityHco3Ppm: w.alkalinity_hco3_ppm,
      ecMsCm: w.ec_ms_cm ?? null,
      ph: w.ph ?? null,
      userId,
    });
  }

  const farmProductIdByGuestId = new Map<string, string>();

  for (const f of plan.fertilizers) {
    const newId = await saveFarmFertilizerProduct(supabase, {
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
      lines: f.lines,
    });
    farmProductIdByGuestId.set(f.id, newId);
  }

  for (const fav of plan.favorites) {
    if (fav.startsWith('farm:')) {
      const guestId = fav.replace(/^farm:/, '');
      const cloudId = farmProductIdByGuestId.get(guestId);
      if (!cloudId) continue;
      await toggleNutrientFavorite(supabase, {
        farmId,
        userId,
        productScope: 'farm',
        farmProductId: cloudId,
        favorited: true,
      });
      continue;
    }
    await toggleNutrientFavorite(supabase, {
      farmId,
      userId,
      productScope: 'catalog',
      catalogProductId: fav,
      favorited: true,
    });
  }

  for (const sys of plan.feedSystems) {
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
  }

  for (const recipe of plan.recipes) {
    const result = recipe.inputs._solverResult as SolveForwardResult | undefined;
    if (!result) continue;
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
  }
}

export function buildMergePlanFromStore(
  store: NutrientGuestStore,
  existing: {
    waterNames: string[];
    fertilizerExternalKeys: string[];
    feedSystemNames: string[];
    recipeNames: string[];
  },
): GuestMergePlan {
  return buildGuestMergePlan(store, existing);
}
