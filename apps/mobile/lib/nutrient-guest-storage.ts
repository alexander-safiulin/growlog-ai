import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NUTRIENT_GUEST_STORAGE_KEY,
  emptyNutrientGuestStore,
  parseNutrientGuestStore,
  serializeNutrientGuestStore,
  type NutrientGuestStore,
} from '@growlog/domain';

export async function loadNutrientGuestStoreMobile(): Promise<NutrientGuestStore> {
  try {
    const raw = await AsyncStorage.getItem(NUTRIENT_GUEST_STORAGE_KEY);
    return parseNutrientGuestStore(raw) ?? emptyNutrientGuestStore();
  } catch {
    return emptyNutrientGuestStore();
  }
}

export async function saveNutrientGuestStoreMobile(store: NutrientGuestStore): Promise<void> {
  await AsyncStorage.setItem(NUTRIENT_GUEST_STORAGE_KEY, serializeNutrientGuestStore(store));
}
