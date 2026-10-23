import {
  NUTRIENT_GUEST_STORAGE_KEY,
  emptyNutrientGuestStore,
  parseNutrientGuestStore,
  serializeNutrientGuestStore,
  type NutrientGuestStore,
} from '@growlog/domain';

export function loadNutrientGuestStore(): NutrientGuestStore {
  if (typeof window === 'undefined') return emptyNutrientGuestStore();
  try {
    const parsed = parseNutrientGuestStore(window.localStorage.getItem(NUTRIENT_GUEST_STORAGE_KEY));
    return parsed ?? emptyNutrientGuestStore();
  } catch {
    return emptyNutrientGuestStore();
  }
}

export function saveNutrientGuestStore(store: NutrientGuestStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NUTRIENT_GUEST_STORAGE_KEY, serializeNutrientGuestStore(store));
  } catch {
    /* ignore quota */
  }
}
