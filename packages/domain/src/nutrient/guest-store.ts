export const NUTRIENT_GUEST_STORE_VERSION = 1 as const;
export const NUTRIENT_GUEST_STORAGE_KEY = 'growlog_nutrient_guest_v1';

export type GuestCompositionLine = {
  form_key: string;
  value_pct: number;
  n_form?: string | null;
};

export type GuestFertilizer = {
  id: string;
  external_key: string;
  brand: string;
  name: string;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  density_g_per_ml: number | null;
  label_basis: 'w_w' | 'w_v' | null;
  metadata: Record<string, unknown>;
  lines: GuestCompositionLine[];
};

export type GuestWaterProfile = {
  id: string;
  name: string;
  water_ppm: Record<string, number>;
  alkalinity_hco3_ppm: number | null;
  ec_ms_cm?: number | null;
  ph?: number | null;
};

export type GuestFeedSystemStep = {
  id: string;
  step_order: number;
  week_label: string | null;
  stage: string | null;
  target_ppm: Record<string, number>;
  ph_target: number | null;
  ec_target_ms_cm: number | null;
};

export type GuestFeedSystem = {
  id: string;
  name: string;
  notes: string | null;
  steps: GuestFeedSystemStep[];
};

export type GuestRecipe = {
  id: string;
  name: string;
  solution_kind: 'recipe' | 'stock' | 'working';
  volume_l: number;
  inputs: Record<string, unknown>;
};

export type NutrientGuestStore = {
  version: typeof NUTRIENT_GUEST_STORE_VERSION;
  favorites: string[];
  fertilizers: GuestFertilizer[];
  waterProfiles: GuestWaterProfile[];
  feedSystems: GuestFeedSystem[];
  recipes: GuestRecipe[];
  /** Farm ids for which local data was already merged to cloud (per device). */
  mergedFarmIds?: string[];
};

export function createGuestId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyNutrientGuestStore(): NutrientGuestStore {
  return {
    version: NUTRIENT_GUEST_STORE_VERSION,
    favorites: [],
    fertilizers: [],
    waterProfiles: [],
    feedSystems: [],
    recipes: [],
    mergedFarmIds: [],
  };
}

export function parseNutrientGuestStore(raw: string | null | undefined): NutrientGuestStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NutrientGuestStore;
    if (parsed?.version !== NUTRIENT_GUEST_STORE_VERSION) return null;
    return {
      ...emptyNutrientGuestStore(),
      ...parsed,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      fertilizers: Array.isArray(parsed.fertilizers) ? parsed.fertilizers : [],
      waterProfiles: Array.isArray(parsed.waterProfiles) ? parsed.waterProfiles : [],
      feedSystems: Array.isArray(parsed.feedSystems) ? parsed.feedSystems : [],
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
      mergedFarmIds: Array.isArray(parsed.mergedFarmIds) ? parsed.mergedFarmIds : [],
    };
  } catch {
    return null;
  }
}

export function serializeNutrientGuestStore(store: NutrientGuestStore): string {
  return JSON.stringify(store);
}

export function guestStoreHasUserData(store: NutrientGuestStore): boolean {
  return (
    store.favorites.length > 0 ||
    store.fertilizers.length > 0 ||
    store.waterProfiles.length > 0 ||
    store.feedSystems.length > 0 ||
    store.recipes.length > 0
  );
}

export function shouldOfferGuestMerge(store: NutrientGuestStore, farmId: string): boolean {
  if (!guestStoreHasUserData(store)) return false;
  return !(store.mergedFarmIds ?? []).includes(farmId);
}

export function markGuestMergedForFarm(store: NutrientGuestStore, farmId: string): NutrientGuestStore {
  const merged = new Set(store.mergedFarmIds ?? []);
  merged.add(farmId);
  return { ...store, mergedFarmIds: [...merged] };
}

/** After successful cloud merge, drop guest copies but keep merge markers. */
export function clearGuestUserPayload(store: NutrientGuestStore, farmId: string): NutrientGuestStore {
  const cleared = emptyNutrientGuestStore();
  cleared.mergedFarmIds = markGuestMergedForFarm(store, farmId).mergedFarmIds;
  return cleared;
}

export type GuestMergePlan = {
  favorites: string[];
  fertilizers: GuestFertilizer[];
  waterProfiles: GuestWaterProfile[];
  feedSystems: GuestFeedSystem[];
  recipes: GuestRecipe[];
};

/** Pure merge plan: guest rows plus existing farm names/keys for dedupe hints. */
export function buildGuestMergePlan(
  store: NutrientGuestStore,
  existing: {
    waterNames: string[];
    fertilizerExternalKeys: string[];
    feedSystemNames: string[];
    recipeNames: string[];
  },
): GuestMergePlan {
  const waterNames = new Set(existing.waterNames.map((n) => n.trim().toLowerCase()));
  const fertKeys = new Set(existing.fertilizerExternalKeys.map((k) => k.trim().toLowerCase()));
  const systemNames = new Set(existing.feedSystemNames.map((n) => n.trim().toLowerCase()));
  const recipeNames = new Set(existing.recipeNames.map((n) => n.trim().toLowerCase()));

  return {
    favorites: [...store.favorites],
    waterProfiles: store.waterProfiles.filter((w) => !waterNames.has(w.name.trim().toLowerCase())),
    fertilizers: store.fertilizers.filter((f) => !fertKeys.has(f.external_key.trim().toLowerCase())),
    feedSystems: store.feedSystems.filter((s) => !systemNames.has(s.name.trim().toLowerCase())),
    recipes: store.recipes.filter((r) => !recipeNames.has(r.name.trim().toLowerCase())),
  };
}

export function countGuestMergeItems(plan: GuestMergePlan): number {
  return (
    plan.favorites.length +
    plan.fertilizers.length +
    plan.waterProfiles.length +
    plan.feedSystems.length +
    plan.recipes.length
  );
}
