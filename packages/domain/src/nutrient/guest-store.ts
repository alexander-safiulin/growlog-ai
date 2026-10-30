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
  recipe_id?: string | null;
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

/** User-saved ppm target (from a mix they liked), not a catalog reference profile. */
export type GuestCustomTargetProfile = {
  id: string;
  name: string;
  target_ppm: Record<string, number>;
  overdose_pct?: Record<string, number>;
};

/** Calculated mix kept on device for comparison. Not a recipe and not a target profile. */
export type GuestMixFavoriteDose = {
  fertilizerId: string;
  name: string;
  amountPerL: number;
  unit: 'g_per_L' | 'ml_per_L';
  tank: 'single' | 'a' | 'b';
};

export type GuestMixFavorite = {
  id: string;
  savedAt: string;
  label: string;
  matchPct: number;
  ecMsCm: number | null;
  volumeL: number;
  targetPpm: Record<string, number>;
  achievedPpm: Record<string, number>;
  doses: GuestMixFavoriteDose[];
};

export type GuestMixFavoriteDraft = Omit<GuestMixFavorite, 'id' | 'savedAt'>;

export function mixFavoriteFingerprint(
  doses: ReadonlyArray<{ fertilizerId: string; amountPerL: number; tank?: string | null }>,
): string {
  return doses
    .filter((dose) => dose.amountPerL > 0)
    .map(
      (dose) =>
        `${dose.fertilizerId}:${(dose.tank ?? 'single').toLowerCase()}:${dose.amountPerL.toFixed(3)}`,
    )
    .sort()
    .join('|');
}

export type GuestWorkspaceSession = {
  selectedIds?: string[];
  profileSlug?: string;
  activeSystemId?: string;
  activeStepId?: string;
  activeWaterProfileId?: string;
  activeFeedScheduleId?: string;
  volumeL?: number;
  tankMode?: 'single' | 'ab';
  model?: 'canonical' | 'hydroodo_legacy';
  stockFactor?: number;
};

export type GuestFarmMergeProgress = {
  waterProfileIds: string[];
  fertilizerIds: string[];
  feedSystemIds: string[];
  recipeIds: string[];
  favoriteKeys: string[];
  guestFertilizerToFarmProductId: Record<string, string>;
};

export type NutrientGuestStore = {
  version: typeof NUTRIENT_GUEST_STORE_VERSION;
  favorites: string[];
  fertilizers: GuestFertilizer[];
  waterProfiles: GuestWaterProfile[];
  feedSystems: GuestFeedSystem[];
  recipes: GuestRecipe[];
  customTargetProfiles?: GuestCustomTargetProfile[];
  mixFavorites?: GuestMixFavorite[];
  workspace?: GuestWorkspaceSession;
  mergeProgressByFarm?: Record<string, GuestFarmMergeProgress>;
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
    customTargetProfiles: [],
    mixFavorites: [],
    mergeProgressByFarm: {},
  };
}

function parseMixFavorites(raw: unknown): GuestMixFavorite[] {
  if (!Array.isArray(raw)) return [];
  const out: GuestMixFavorite[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Partial<GuestMixFavorite>;
    if (typeof item.id !== 'string' || typeof item.label !== 'string' || !Array.isArray(item.doses)) continue;
    const doses: GuestMixFavoriteDose[] = [];
    for (const dose of item.doses) {
      if (!dose || typeof dose !== 'object') continue;
      const line = dose as Partial<GuestMixFavoriteDose>;
      if (typeof line.fertilizerId !== 'string' || typeof line.name !== 'string') continue;
      if (typeof line.amountPerL !== 'number' || !Number.isFinite(line.amountPerL)) continue;
      doses.push({
        fertilizerId: line.fertilizerId,
        name: line.name,
        amountPerL: line.amountPerL,
        unit: line.unit === 'ml_per_L' ? 'ml_per_L' : 'g_per_L',
        tank: line.tank === 'a' || line.tank === 'b' ? line.tank : 'single',
      });
    }
    out.push({
      id: item.id,
      savedAt: typeof item.savedAt === 'string' ? item.savedAt : '',
      label: item.label,
      matchPct: typeof item.matchPct === 'number' && Number.isFinite(item.matchPct) ? item.matchPct : 0,
      ecMsCm: typeof item.ecMsCm === 'number' && Number.isFinite(item.ecMsCm) ? item.ecMsCm : null,
      volumeL: typeof item.volumeL === 'number' && Number.isFinite(item.volumeL) ? item.volumeL : 0,
      targetPpm: item.targetPpm && typeof item.targetPpm === 'object' ? item.targetPpm : {},
      achievedPpm: item.achievedPpm && typeof item.achievedPpm === 'object' ? item.achievedPpm : {},
      doses,
    });
  }
  return out;
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
      customTargetProfiles: Array.isArray(parsed.customTargetProfiles)
        ? parsed.customTargetProfiles
        : [],
      mixFavorites: parseMixFavorites(parsed.mixFavorites),
      workspace: parsed.workspace ?? undefined,
      mergeProgressByFarm:
        parsed.mergeProgressByFarm && typeof parsed.mergeProgressByFarm === 'object'
          ? parsed.mergeProgressByFarm
          : {},
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
    store.recipes.length > 0 ||
    (store.customTargetProfiles?.length ?? 0) > 0 ||
    (store.mixFavorites?.length ?? 0) > 0
  );
}

export type GuestMergePlan = {
  favorites: string[];
  fertilizers: GuestFertilizer[];
  waterProfiles: GuestWaterProfile[];
  feedSystems: GuestFeedSystem[];
  recipes: GuestRecipe[];
};
