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
  saveRecipe: (recipe: GuestRecipe) => Promise<string>;
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
    guestRecipeToCloudRecipeId: {},
  };
}

function remapFeedSystemRecipeIds(
  system: GuestFeedSystem,
  recipeIdMap: Record<string, string>,
): GuestFeedSystem {
  return {
    ...system,
    steps: system.steps.map((step) => {
      if (!step.recipe_id) return step;
      const cloudId = recipeIdMap[step.recipe_id];
      return { ...step, recipe_id: cloudId ?? null };
    }),
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
    guestRecipeToCloudRecipeId: { ...(raw.guestRecipeToCloudRecipeId ?? {}) },
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

/** Name match for recipes skipped as duplicates, so feed-system steps still point at the cloud row. */
export function rememberCloudRecipeIdsByName(
  store: NutrientGuestStore,
  farmId: string,
  cloudRecipes: Array<{ id: string; name: string | null }>,
): NutrientGuestStore {
  const progress = getFarmMergeProgress(store, farmId);
  const byName = new Map<string, string>();
  for (const recipe of cloudRecipes) {
    const name = (recipe.name ?? '').trim().toLowerCase();
    if (!name || !recipe.id) continue;
    byName.set(name, recipe.id);
  }
  let changed = false;
  for (const recipe of store.recipes) {
    if (progress.guestRecipeToCloudRecipeId[recipe.id]) continue;
    const cloudId = byName.get(recipe.name.trim().toLowerCase());
    if (!cloudId) continue;
    progress.guestRecipeToCloudRecipeId[recipe.id] = cloudId;
    changed = true;
  }
  return changed ? withProgress(store, farmId, progress) : store;
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

  const finalize = (): GuestMergeApplyResult => {
    working = withProgress(working, farmId, progress);
    if (
      uploaded.waterIds.length +
        uploaded.fertilizerIds.length +
        uploaded.feedSystemIds.length +
        uploaded.recipeIds.length +
        uploaded.favoriteKeys.length >
      0
    ) {
      working = removeUploadedGuestItems(working, uploaded);
    }
    return { store: working, uploadedCount, failures };
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
      return finalize();
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
      return finalize();
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
          return finalize();
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
      return finalize();
    }
  }

  const recipeIdMap = { ...progress.guestRecipeToCloudRecipeId };

  for (const recipe of plan.recipes) {
    try {
      const cloudId = await executor.saveRecipe(recipe);
      recipeIdMap[recipe.id] = cloudId;
      progress.guestRecipeToCloudRecipeId[recipe.id] = cloudId;
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
      return finalize();
    }
  }

  for (const sys of plan.feedSystems) {
    try {
      await executor.saveFeedSystem(remapFeedSystemRecipeIds(sys, recipeIdMap));
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
      return finalize();
    }
  }

  return finalize();
}
