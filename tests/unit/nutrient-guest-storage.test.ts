import { describe, expect, it } from 'vitest';
import {
  analyzeGuestMerge,
  emptyNutrientGuestStore,
  guestMergeHasPendingUpload,
  parseNutrientGuestStore,
  serializeNutrientGuestStore,
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

  it('merge analysis skips duplicate names', () => {
    const store = emptyNutrientGuestStore();
    store.waterProfiles.push({
      id: 'w1',
      name: 'Tap',
      water_ppm: {},
      alkalinity_hco3_ppm: null,
    });
    const analysis = analyzeGuestMerge(store, 'farm-a', {
      waterNames: ['Tap'],
      fertilizerExternalKeys: [],
      feedSystemNames: [],
      recipeNames: [],
    });
    expect(guestMergeHasPendingUpload(analysis)).toBe(false);
    expect(analysis.duplicates).toHaveLength(1);
  });
});
