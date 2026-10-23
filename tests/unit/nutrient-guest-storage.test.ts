import { describe, expect, it } from 'vitest';
import {
  buildGuestMergePlan,
  countGuestMergeItems,
  emptyNutrientGuestStore,
  parseNutrientGuestStore,
  serializeNutrientGuestStore,
  shouldOfferGuestMerge,
} from '@growlog/domain';

describe('nutrient guest store', () => {
  it('round-trips through JSON', () => {
    const store = emptyNutrientGuestStore();
    store.waterProfiles.push({
      id: 'w1',
      name: 'Tap',
      water_ppm: { Ca: 40 },
      alkalinity_hco3_ppm: 80,
    });
    const raw = serializeNutrientGuestStore(store);
    const parsed = parseNutrientGuestStore(raw);
    expect(parsed?.waterProfiles).toHaveLength(1);
    expect(parsed?.waterProfiles[0].name).toBe('Tap');
  });

  it('merge plan skips duplicate names', () => {
    const store = emptyNutrientGuestStore();
    store.waterProfiles.push({
      id: 'w1',
      name: 'Tap',
      water_ppm: {},
      alkalinity_hco3_ppm: null,
    });
    const plan = buildGuestMergePlan(store, {
      waterNames: ['Tap'],
      fertilizerExternalKeys: [],
      feedSystemNames: [],
      recipeNames: [],
    });
    expect(plan.waterProfiles).toHaveLength(0);
    expect(countGuestMergeItems(plan)).toBe(0);
  });

  it('offers merge until farm marked merged', () => {
    const store = emptyNutrientGuestStore();
    store.favorites.push('cat-1');
    expect(shouldOfferGuestMerge(store, 'farm-a')).toBe(true);
    store.mergedFarmIds = ['farm-a'];
    expect(shouldOfferGuestMerge(store, 'farm-a')).toBe(false);
  });
});
