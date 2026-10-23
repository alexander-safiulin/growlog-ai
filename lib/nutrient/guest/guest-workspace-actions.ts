import {
  createGuestId,
  type GuestFertilizer,
  type GuestFeedSystem,
  type GuestFeedSystemStep,
  type GuestRecipe,
  type GuestWaterProfile,
  type NutrientGuestStore,
} from '@growlog/domain';

export function toggleGuestFavorite(store: NutrientGuestStore, productId: string): NutrientGuestStore {
  const set = new Set(store.favorites);
  if (set.has(productId)) set.delete(productId);
  else set.add(productId);
  return { ...store, favorites: [...set] };
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
