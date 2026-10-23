import type {
  GuestFarmMergeProgress,
  GuestFeedSystem,
  GuestFertilizer,
  GuestMergePlan,
  GuestRecipe,
  GuestWaterProfile,
  NutrientGuestStore,
} from './guest-store';

export type GuestMergeDuplicate = {
  kind: 'water' | 'fertilizer' | 'feedSystem' | 'recipe';
  guestId: string;
  label: string;
  reason: 'name_exists' | 'external_key_exists';
};

export type GuestMergeAnalysis = {
  plan: GuestMergePlan;
  duplicates: GuestMergeDuplicate[];
  pendingCount: number;
};

export type GuestMergeFailure = {
  kind: 'water' | 'fertilizer' | 'favorite' | 'feedSystem' | 'recipe';
  guestId: string;
  label: string;
  message: string;
};

export type GuestMergeApplyResult = {
  store: NutrientGuestStore;
  uploadedCount: number;
  failures: GuestMergeFailure[];
};

export type GuestMergeExecutor = {
  upsertWater: (profile: GuestWaterProfile) => Promise<void>;
  saveFertilizer: (product: GuestFertilizer) => Promise<string>;
  saveFeedSystem: (system: GuestFeedSystem) => Promise<void>;
  saveRecipe: (recipe: GuestRecipe) => Promise<void>;
  toggleCatalogFavorite: (catalogProductId: string) => Promise<void>;
  toggleFarmFavorite: (farmProductId: string) => Promise<void>;
};

function emptyProgress(): GuestFarmMergeProgress {
  return {
    waterProfileIds: [],
    fertilizerIds: [],
    feedSystemIds: [],
    recipeIds: [],
    favoriteKeys: [],
    guestFertilizerToFarmProductId: {},
  };
}

export function getFarmMergeProgress(store: NutrientGuestStore, farmId: string): GuestFarmMergeProgress {
  const raw = store.mergeProgressByFarm?.[farmId];
  if (!raw) return emptyProgress();
  return {
    waterProfileIds: [...(raw.waterProfileIds ?? [])],
    fertilizerIds: [...(raw.fertilizerIds ?? [])],
    feedSystemIds: [...(raw.feedSystemIds ?? [])],
    recipeIds: [...(raw.recipeIds ?? [])],
    favoriteKeys: [...(raw.favoriteKeys ?? [])],
    guestFertilizerToFarmProductId: { ...(raw.guestFertilizerToFarmProductId ?? {}) },
  };
}

function withProgress(
  store: NutrientGuestStore,
  farmId: string,
  progress: GuestFarmMergeProgress,
): NutrientGuestStore {
  return {
    ...store,
    mergeProgressByFarm: {
      ...(store.mergeProgressByFarm ?? {}),
      [farmId]: progress,
    },
  };
}

export function analyzeGuestMerge(
  store: NutrientGuestStore,
  farmId: string,
  existing: {
    waterNames: string[];
    fertilizerExternalKeys: string[];
    feedSystemNames: string[];
    recipeNames: string[];
  },
): GuestMergeAnalysis {
  const progress = getFarmMergeProgress(store, farmId);
  const waterNames = new Set(existing.waterNames.map((n) => n.trim().toLowerCase()));
  const fertKeys = new Set(existing.fertilizerExternalKeys.map((k) => k.trim().toLowerCase()));
  const systemNames = new Set(existing.feedSystemNames.map((n) => n.trim().toLowerCase()));
  const recipeNames = new Set(existing.recipeNames.map((n) => n.trim().toLowerCase()));

  const duplicates: GuestMergeDuplicate[] = [];
  const plan: GuestMergePlan = {
    favorites: [],
    fertilizers: [],
    waterProfiles: [],
    feedSystems: [],
    recipes: [],
  };

  for (const w of store.waterProfiles) {
    if (progress.waterProfileIds.includes(w.id)) continue;
    if (waterNames.has(w.name.trim().toLowerCase())) {
      duplicates.push({ kind: 'water', guestId: w.id, label: w.name, reason: 'name_exists' });
      continue;
    }
    plan.waterProfiles.push(w);
  }

  for (const f of store.fertilizers) {
    if (progress.fertilizerIds.includes(f.id)) continue;
    if (fertKeys.has(f.external_key.trim().toLowerCase())) {
      duplicates.push({
        kind: 'fertilizer',
        guestId: f.id,
        label: `${f.brand} — ${f.name}`,
        reason: 'external_key_exists',
      });
      continue;
    }
    plan.fertilizers.push(f);
  }

  for (const s of store.feedSystems) {
    if (progress.feedSystemIds.includes(s.id)) continue;
    if (systemNames.has(s.name.trim().toLowerCase())) {
      duplicates.push({ kind: 'feedSystem', guestId: s.id, label: s.name, reason: 'name_exists' });
      continue;
    }
    plan.feedSystems.push(s);
  }

  for (const r of store.recipes) {
    if (progress.recipeIds.includes(r.id)) continue;
    if (recipeNames.has(r.name.trim().toLowerCase())) {
      duplicates.push({ kind: 'recipe', guestId: r.id, label: r.name, reason: 'name_exists' });
      continue;
    }
    plan.recipes.push(r);
  }

  for (const fav of store.favorites) {
    if (progress.favoriteKeys.includes(fav)) continue;
    plan.favorites.push(fav);
  }

  const pendingCount =
    plan.favorites.length +
    plan.fertilizers.length +
    plan.waterProfiles.length +
    plan.feedSystems.length +
    plan.recipes.length;

  return { plan, duplicates, pendingCount };
}

export function guestMergeHasPendingUpload(analysis: GuestMergeAnalysis): boolean {
  return analysis.pendingCount > 0;
}

export function removeUploadedGuestItems(
  store: NutrientGuestStore,
  uploaded: {
    waterIds: string[];
    fertilizerIds: string[];
    feedSystemIds: string[];
    recipeIds: string[];
    favoriteKeys: string[];
  },
): NutrientGuestStore {
  const waterSet = new Set(uploaded.waterIds);
  const fertSet = new Set(uploaded.fertilizerIds);
  const sysSet = new Set(uploaded.feedSystemIds);
  const recSet = new Set(uploaded.recipeIds);
  const favSet = new Set(uploaded.favoriteKeys);

  const nextFavorites = store.favorites.filter((f) => {
    if (!favSet.has(f)) return true;
    if (f.startsWith('farm:')) {
      const guestId = f.replace(/^farm:/, '');
      return !fertSet.has(guestId);
    }
    return false;
  });

  return {
    ...store,
    waterProfiles: store.waterProfiles.filter((w) => !waterSet.has(w.id)),
    fertilizers: store.fertilizers.filter((f) => !fertSet.has(f.id)),
    feedSystems: store.feedSystems.filter((s) => !sysSet.has(s.id)),
    recipes: store.recipes.filter((r) => !recSet.has(r.id)),
    favorites: nextFavorites,
  };
}

export async function applyGuestMergePlanWithExecutor(
  store: NutrientGuestStore,
  farmId: string,
  plan: GuestMergePlan,
  executor: GuestMergeExecutor,
): Promise<GuestMergeApplyResult> {
  let working = store;
  let progress = getFarmMergeProgress(working, farmId);
  const failures: GuestMergeFailure[] = [];
  let uploadedCount = 0;

  const uploaded = {
    waterIds: [] as string[],
    fertilizerIds: [] as string[],
    feedSystemIds: [] as string[],
    recipeIds: [] as string[],
    favoriteKeys: [] as string[],
  };

  for (const w of plan.waterProfiles) {
    try {
      await executor.upsertWater(w);
      progress.waterProfileIds.push(w.id);
      uploaded.waterIds.push(w.id);
      uploadedCount += 1;
      working = withProgress(working, farmId, progress);
    } catch (err) {
      failures.push({
        kind: 'water',
        guestId: w.id,
        label: w.name,
        message: err instanceof Error ? err.message : String(err),
      });
      return { store: working, uploadedCount, failures };
    }
  }

  for (const f of plan.fertilizers) {
    try {
      const cloudId = await executor.saveFertilizer(f);
      progress.fertilizerIds.push(f.id);
      progress.guestFertilizerToFarmProductId[f.id] = cloudId;
      uploaded.fertilizerIds.push(f.id);
      uploadedCount += 1;
      working = withProgress(working, farmId, progress);
    } catch (err) {
      failures.push({
        kind: 'fertilizer',
        guestId: f.id,
        label: `${f.brand} — ${f.name}`,
        message: err instanceof Error ? err.message : String(err),
      });
      return { store: working, uploadedCount, failures };
    }
  }

  for (const fav of plan.favorites) {
    try {
      if (fav.startsWith('farm:')) {
        const guestId = fav.replace(/^farm:/, '');
        const cloudId =
          progress.guestFertilizerToFarmProductId[guestId] ??
          working.mergeProgressByFarm?.[farmId]?.guestFertilizerToFarmProductId?.[guestId];
        if (!cloudId) {
          failures.push({
            kind: 'favorite',
            guestId: fav,
            label: fav,
            message: 'missing_farm_product_mapping',
          });
          return { store: working, uploadedCount, failures };
        }
        await executor.toggleFarmFavorite(cloudId);
      } else {
        await executor.toggleCatalogFavorite(fav);
      }
      progress.favoriteKeys.push(fav);
      uploaded.favoriteKeys.push(fav);
      uploadedCount += 1;
      working = withProgress(working, farmId, progress);
    } catch (err) {
      failures.push({
        kind: 'favorite',
        guestId: fav,
        label: fav,
        message: err instanceof Error ? err.message : String(err),
      });
      return { store: working, uploadedCount, failures };
    }
  }

  for (const sys of plan.feedSystems) {
    try {
      await executor.saveFeedSystem(sys);
      progress.feedSystemIds.push(sys.id);
      uploaded.feedSystemIds.push(sys.id);
      uploadedCount += 1;
      working = withProgress(working, farmId, progress);
    } catch (err) {
      failures.push({
        kind: 'feedSystem',
        guestId: sys.id,
        label: sys.name,
        message: err instanceof Error ? err.message : String(err),
      });
      return { store: working, uploadedCount, failures };
    }
  }

  for (const recipe of plan.recipes) {
    try {
      await executor.saveRecipe(recipe);
      progress.recipeIds.push(recipe.id);
      uploaded.recipeIds.push(recipe.id);
      uploadedCount += 1;
      working = withProgress(working, farmId, progress);
    } catch (err) {
      failures.push({
        kind: 'recipe',
        guestId: recipe.id,
        label: recipe.name,
        message: err instanceof Error ? err.message : String(err),
      });
      return { store: working, uploadedCount, failures };
    }
  }

  working = removeUploadedGuestItems(working, uploaded);
  working = withProgress(working, farmId, progress);
  return { store: working, uploadedCount, failures };
}
