import type {
  FarmFeedSystemRow,
  FarmFeedSystemStepRow,
  FarmFertilizerRow,
} from '@growlog/domain';
import type {
  GuestFeedSystem,
  GuestFertilizer,
  GuestRecipe,
  GuestWaterProfile,
  NutrientGuestStore,
} from '@growlog/domain';
import { customTargetProfilesFromGuest } from '@/lib/nutrient/custom-target-profile';
import type { NutrientSolutionKind } from '@growlog/domain';

export type GuestSavedRecipeRow = {
  id: string;
  name: string;
  solution_kind: NutrientSolutionKind;
  cycle_id: string | null;
  linked_event_id: string | null;
  parent_recipe_id: string | null;
  inputs: Record<string, unknown>;
  volume_l: number;
};

const GUEST_FARM_ID = '00000000-0000-0000-0000-000000000000';

export function guestFertilizersToFarmRows(fertilizers: GuestFertilizer[]): FarmFertilizerRow[] {
  return fertilizers.map((f) => ({
    id: f.id,
    farm_id: GUEST_FARM_ID,
    external_key: f.external_key,
    brand: f.brand,
    name: f.name,
    physical_form: f.physical_form,
    dose_unit: f.dose_unit,
    density_g_per_ml: f.density_g_per_ml,
    label_basis: f.label_basis,
    metadata: f.metadata,
  }));
}

export function guestFertilizerLines(
  fertilizers: GuestFertilizer[],
): Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>> {
  const map: Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>> = {};
  for (const f of fertilizers) {
    map[f.id] = f.lines.map((l) => ({
      form_key: l.form_key,
      value_pct: l.value_pct,
      n_form: l.n_form ?? null,
    }));
  }
  return map;
}

export function guestWaterToWorkspace(waters: GuestWaterProfile[]) {
  return waters.map((w) => ({
    id: w.id,
    name: w.name,
    water_ppm: w.water_ppm,
    alkalinity_hco3_ppm: w.alkalinity_hco3_ppm,
    ec_ms_cm: w.ec_ms_cm ?? null,
    ph: w.ph ?? null,
  }));
}

export function guestFeedSystemsToFarmRows(systems: GuestFeedSystem[]): FarmFeedSystemRow[] {
  return systems.map((s) => ({
    id: s.id,
    farm_id: GUEST_FARM_ID,
    name: s.name,
    notes: s.notes,
    created_by: null,
  }));
}

export function guestFeedStepsBySystem(systems: GuestFeedSystem[]): Record<string, FarmFeedSystemStepRow[]> {
  const map: Record<string, FarmFeedSystemStepRow[]> = {};
  for (const s of systems) {
    map[s.id] = s.steps.map((step) => ({
      id: step.id,
      system_id: s.id,
      farm_id: GUEST_FARM_ID,
      step_order: step.step_order,
      week_label: step.week_label,
      stage: step.stage,
      target_ppm: step.target_ppm,
      ph_target: step.ph_target,
      ec_target_ms_cm: step.ec_target_ms_cm,
      light_hours: null,
      light_ppfd: null,
    }));
  }
  return map;
}

export function guestRecipesToSavedRows(recipes: GuestRecipe[]): GuestSavedRecipeRow[] {
  return recipes.map((r) => ({
    id: r.id,
    name: r.name,
    solution_kind: r.solution_kind,
    cycle_id: null,
    linked_event_id: null,
    parent_recipe_id: null,
    inputs: r.inputs,
    volume_l: r.volume_l,
  }));
}

export function applyGuestStoreToWorkspaceState(store: NutrientGuestStore) {
  const favSet = new Set(store.favorites);
  return {
    waterProfiles: guestWaterToWorkspace(store.waterProfiles),
    farmProducts: guestFertilizersToFarmRows(store.fertilizers),
    farmLines: guestFertilizerLines(store.fertilizers),
    feedSystems: guestFeedSystemsToFarmRows(store.feedSystems),
    feedStepsBySystem: guestFeedStepsBySystem(store.feedSystems),
    savedRecipes: guestRecipesToSavedRows(store.recipes),
    favoriteIds: favSet,
    customTargetProfiles: store.customTargetProfiles ?? [],
    myTargetProfiles: customTargetProfilesFromGuest(store.customTargetProfiles ?? []),
  };
}
