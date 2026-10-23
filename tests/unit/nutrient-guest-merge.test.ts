import { describe, expect, it, vi } from 'vitest';
import {
  analyzeGuestMerge,
  applyGuestMergePlanWithExecutor,
  emptyNutrientGuestStore,
  type GuestMergeExecutor,
} from '@growlog/domain';

const farmId = 'farm-1';

describe('guest merge analysis', () => {
  it('lists duplicates separately from upload plan', () => {
    const store = emptyNutrientGuestStore();
    store.waterProfiles.push({
      id: 'w1',
      name: 'Tap',
      water_ppm: {},
      alkalinity_hco3_ppm: null,
    });
    const analysis = analyzeGuestMerge(store, farmId, {
      waterNames: ['Tap'],
      fertilizerExternalKeys: [],
      feedSystemNames: [],
      recipeNames: [],
    });
    expect(analysis.pendingCount).toBe(0);
    expect(analysis.duplicates).toHaveLength(1);
    expect(analysis.plan.waterProfiles).toHaveLength(0);
  });

  it('skips items already merged in progress', () => {
    const store = emptyNutrientGuestStore();
    store.waterProfiles.push({
      id: 'w1',
      name: 'Well',
      water_ppm: {},
      alkalinity_hco3_ppm: null,
    });
    store.mergeProgressByFarm = {
      [farmId]: {
        waterProfileIds: ['w1'],
        fertilizerIds: [],
        feedSystemIds: [],
        recipeIds: [],
        favoriteKeys: [],
        guestFertilizerToFarmProductId: {},
      },
    };
    const analysis = analyzeGuestMerge(store, farmId, {
      waterNames: [],
      fertilizerExternalKeys: [],
      feedSystemNames: [],
      recipeNames: [],
    });
    expect(analysis.pendingCount).toBe(0);
  });
});

describe('applyGuestMergePlanWithExecutor', () => {
  it('resumes after partial failure and maps guest favorites', async () => {
    const store = emptyNutrientGuestStore();
    store.fertilizers.push({
      id: 'f1',
      external_key: 'guest|k',
      brand: 'B',
      name: 'K salt',
      physical_form: 'solid',
      dose_unit: 'g_per_L',
      density_g_per_ml: null,
      label_basis: null,
      metadata: {},
      lines: [{ form_key: 'K', value_pct: 50 }],
    });
    store.favorites.push('farm:f1', 'catalog-1');

    const executor: GuestMergeExecutor = {
      upsertWater: vi.fn(),
      saveFertilizer: vi.fn(async () => 'cloud-f1'),
      saveFeedSystem: vi.fn(),
      saveRecipe: vi.fn(),
      toggleCatalogFavorite: vi.fn(async () => {
        throw new Error('network');
      }),
      toggleFarmFavorite: vi.fn(),
    };

    const plan = analyzeGuestMerge(store, farmId, {
      waterNames: [],
      fertilizerExternalKeys: [],
      feedSystemNames: [],
      recipeNames: [],
    }).plan;

    const first = await applyGuestMergePlanWithExecutor(store, farmId, plan, executor);
    expect(first.uploadedCount).toBe(2);
    expect(first.failures[0]?.kind).toBe('favorite');
    expect(first.store.mergeProgressByFarm?.[farmId]?.fertilizerIds).toContain('f1');
    expect(first.store.mergeProgressByFarm?.[farmId]?.guestFertilizerToFarmProductId.f1).toBe('cloud-f1');

    const retryExecutor: GuestMergeExecutor = {
      ...executor,
      toggleCatalogFavorite: vi.fn(async () => undefined),
      toggleFarmFavorite: vi.fn(async () => undefined),
    };

    const analysis2 = analyzeGuestMerge(first.store, farmId, {
      waterNames: [],
      fertilizerExternalKeys: ['guest|k'],
      feedSystemNames: [],
      recipeNames: [],
    });
    const second = await applyGuestMergePlanWithExecutor(
      first.store,
      farmId,
      analysis2.plan,
      retryExecutor,
    );
    expect(second.failures).toHaveLength(0);
    expect(second.uploadedCount).toBeGreaterThan(0);
    expect(second.store.favorites).not.toContain('catalog-1');
  });
});
