import {
  createGuestId,
  mixFavoriteFingerprint,
  type GuestFertilizer,
  type GuestFeedSystem,
  type GuestFeedSystemStep,
  type GuestCustomTargetProfile,
  type GuestMixFavorite,
  type GuestMixFavoriteDraft,
  type GuestRecipe,
  type GuestWaterProfile,
  type NutrientGuestStore,
} from '@growlog/domain';
import {
  catalogOverrideExternalKey,
  catalogOverrideTargetId,
  COMPOSITION_EDITED,
  OVERRIDES_CATALOG_PRODUCT_ID,
  type CompositionPctLine,
} from '../fertilizer-composition-override';
import {
  defaultCustomTargetOverdosePct,
  hasUsableTargetPpm,
  normalizeCustomTargetName,
  targetPpmFromAchievedSolution,
} from '../save-custom-target-profile';

export function clearGuestFavorites(store: NutrientGuestStore): NutrientGuestStore {
  return { ...store, favorites: [] };
}

export function toggleGuestFavorite(store: NutrientGuestStore, productId: string): NutrientGuestStore {
  const set = new Set(store.favorites);
  if (set.has(productId)) set.delete(productId);
  else set.add(productId);
  return { ...store, favorites: [...set] };
}

const MIX_FAVORITE_LIMIT = 24;

export function toggleGuestMixFavorite(
  store: NutrientGuestStore,
  draft: GuestMixFavoriteDraft,
): NutrientGuestStore {
  const doses = draft.doses.filter((dose) => dose.amountPerL > 0);
  if (doses.length === 0) return store;
  const key = mixFavoriteFingerprint(doses);
  const current = store.mixFavorites ?? [];
  const existing = current.find((row) => mixFavoriteFingerprint(row.doses) === key);
  if (existing) {
    return { ...store, mixFavorites: current.filter((row) => row.id !== existing.id) };
  }
  const row: GuestMixFavorite = {
    ...draft,
    doses,
    id: createGuestId(),
    savedAt: new Date().toISOString(),
  };
  return { ...store, mixFavorites: [row, ...current].slice(0, MIX_FAVORITE_LIMIT) };
}

export function removeGuestMixFavorite(store: NutrientGuestStore, id: string): NutrientGuestStore {
  return { ...store, mixFavorites: (store.mixFavorites ?? []).filter((row) => row.id !== id) };
}

export function clearGuestMixFavorites(store: NutrientGuestStore): NutrientGuestStore {
  return { ...store, mixFavorites: [] };
}

export function upsertGuestWater(
  store: NutrientGuestStore,
  profile: Omit<GuestWaterProfile, 'id'> & { id?: string },
): NutrientGuestStore {
  const id = profile.id ?? createGuestId();
  const row: GuestWaterProfile = { ...profile, id };
  const rest = store.waterProfiles.filter((w) => w.id !== id);
  return { ...store, waterProfiles: [...rest, row] };
}

export function deleteGuestWater(store: NutrientGuestStore, id: string): NutrientGuestStore {
  return { ...store, waterProfiles: store.waterProfiles.filter((w) => w.id !== id) };
}

export function deleteGuestFertilizer(store: NutrientGuestStore, id: string): NutrientGuestStore {
  return { ...store, fertilizers: store.fertilizers.filter((f) => f.id !== id) };
}

export function applyGuestCompositionEdit(
  store: NutrientGuestStore,
  edit: {
    scope: 'catalog' | 'farm';
    unifiedId: string;
    overrideId?: string;
    externalKey: string;
    brand: string;
    name: string;
    physicalForm: 'solid' | 'liquid';
    doseUnit: 'g_per_L' | 'ml_per_L';
    densityGPerMl: number | null;
    labelBasis: 'w_w' | 'w_v' | null;
    metadata: Record<string, unknown>;
    lines: CompositionPctLine[];
    revertOverride: boolean;
  },
): NutrientGuestStore {
  if (edit.scope === 'catalog') {
    const catalogId = edit.unifiedId;
    const existing = store.fertilizers.find(
      (row) =>
        row.id === edit.overrideId ||
        row.external_key === catalogOverrideExternalKey(catalogId) ||
        catalogOverrideTargetId(row.metadata) === catalogId,
    );
    if (edit.revertOverride) {
      return existing ? deleteGuestFertilizer(store, existing.id) : store;
    }
    return upsertGuestFertilizer(store, {
      id: existing?.id,
      external_key: catalogOverrideExternalKey(catalogId),
      brand: edit.brand,
      name: edit.name,
      physical_form: edit.physicalForm,
      dose_unit: edit.doseUnit,
      density_g_per_ml: edit.densityGPerMl,
      label_basis: edit.labelBasis,
      metadata: {
        ...edit.metadata,
        [OVERRIDES_CATALOG_PRODUCT_ID]: catalogId,
        [COMPOSITION_EDITED]: true,
      },
      lines: edit.lines,
    });
  }

  const id = edit.unifiedId.replace(/^farm:/, '');
  const metadata: Record<string, unknown> = { ...edit.metadata, [COMPOSITION_EDITED]: true };
  delete metadata[OVERRIDES_CATALOG_PRODUCT_ID];
  return upsertGuestFertilizer(store, {
    id,
    external_key: edit.externalKey,
    brand: edit.brand,
    name: edit.name,
    physical_form: edit.physicalForm,
    dose_unit: edit.doseUnit,
    density_g_per_ml: edit.densityGPerMl,
    label_basis: edit.labelBasis,
    metadata,
    lines: edit.lines,
  });
}

export function upsertGuestFertilizer(
  store: NutrientGuestStore,
  product: Omit<GuestFertilizer, 'id'> & { id?: string },
): NutrientGuestStore {
  const id = product.id ?? createGuestId();
  const row: GuestFertilizer = { ...product, id };
  const rest = store.fertilizers.filter((f) => f.id !== id);
  return { ...store, fertilizers: [...rest, row] };
}

export function upsertGuestFeedSystem(
  store: NutrientGuestStore,
  system: Omit<GuestFeedSystem, 'id' | 'steps'> & {
    id?: string;
    steps: GuestFeedSystemStep[];
  },
): NutrientGuestStore {
  const id = system.id ?? createGuestId();
  const row: GuestFeedSystem = {
    id,
    name: system.name,
    notes: system.notes,
    steps: system.steps.map((s, idx) => ({
      ...s,
      id: s.id ?? createGuestId(),
      step_order: s.step_order ?? idx + 1,
    })),
  };
  const rest = store.feedSystems.filter((s) => s.id !== id);
  return { ...store, feedSystems: [...rest, row] };
}

export function deleteGuestFeedSystem(store: NutrientGuestStore, id: string): NutrientGuestStore {
  return { ...store, feedSystems: store.feedSystems.filter((s) => s.id !== id) };
}

export function upsertGuestRecipe(
  store: NutrientGuestStore,
  recipe: Omit<GuestRecipe, 'id'> & { id?: string },
): NutrientGuestStore {
  const id = recipe.id ?? createGuestId();
  const row: GuestRecipe = { ...recipe, id };
  const rest = store.recipes.filter((r) => r.id !== id);
  return { ...store, recipes: [...rest, row] };
}

export function deleteGuestRecipe(store: NutrientGuestStore, id: string): NutrientGuestStore {
  return { ...store, recipes: store.recipes.filter((r) => r.id !== id) };
}

export function upsertGuestCustomTargetProfile(
  store: NutrientGuestStore,
  profile: {
    id?: string;
    name: string;
    target_ppm: Record<string, number>;
    overdose_pct?: Record<string, number>;
  },
): { store: NutrientGuestStore; id: string } {
  const name = normalizeCustomTargetName(profile.name);
  const target_ppm = targetPpmFromAchievedSolution(profile.target_ppm);
  if (!name || !hasUsableTargetPpm(target_ppm)) return { store, id: '' };
  const norm = name.toLocaleLowerCase();
  const existing = (store.customTargetProfiles ?? []).find(
    (row) => normalizeCustomTargetName(row.name).toLocaleLowerCase() === norm,
  );
  const id = existing?.id ?? profile.id ?? createGuestId();
  const row: GuestCustomTargetProfile = {
    id,
    name,
    target_ppm,
    overdose_pct: profile.overdose_pct ?? existing?.overdose_pct ?? defaultCustomTargetOverdosePct(),
  };
  const rest = (store.customTargetProfiles ?? []).filter((item) => item.id !== id);
  return {
    id,
    store: { ...store, customTargetProfiles: [...rest, row] },
  };
}

export function deleteGuestCustomTargetProfile(
  store: NutrientGuestStore,
  id: string,
): NutrientGuestStore {
  return {
    ...store,
    customTargetProfiles: (store.customTargetProfiles ?? []).filter((p) => p.id !== id),
  };
}

export function renameGuestRecipe(
  store: NutrientGuestStore,
  id: string,
  name: string,
): NutrientGuestStore {
  return {
    ...store,
    recipes: store.recipes.map((r) => (r.id === id ? { ...r, name } : r)),
  };
}
