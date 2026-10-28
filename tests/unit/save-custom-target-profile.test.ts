import { describe, expect, it } from 'vitest';
import {
  defaultCustomTargetOverdosePct,
  hasUsableTargetPpm,
  targetPpmFromAchievedSolution,
} from '@/lib/nutrient/save-custom-target-profile';
import { upsertGuestCustomTargetProfile } from '@/lib/nutrient/guest/guest-workspace-actions';
import { emptyNutrientGuestStore } from '@growlog/domain';
import { guestCustomTargetSlug } from '@/lib/nutrient/custom-target-profile';

describe('save custom target profile', () => {
  it('strips near-zero achieved ppm and rounds', () => {
    const ppm = targetPpmFromAchievedSolution({
      N: 105.456,
      P: 0,
      K: 12.004,
      Fe: 0.00001,
    });
    expect(ppm).toEqual({ N: 105.46, K: 12 });
    expect(hasUsableTargetPpm(ppm)).toBe(true);
  });

  it('keeps molybdenum instead of rounding it to zero', () => {
    const ppm = targetPpmFromAchievedSolution({ N: 100, Mo: 0.01234, Cu: 0.02 });
    expect(ppm.Mo).toBe(0.0123);
    expect(ppm.Cu).toBe(0.02);
  });

  it('drops unknown keys and refuses a trace-only target', () => {
    const ppm = targetPpmFromAchievedSolution({ Fe: 1.2, ec: 2, N: Number.NaN });
    expect(ppm).toEqual({ Fe: 1.2 });
    expect(hasUsableTargetPpm(ppm)).toBe(false);
  });

  it('replaces an existing target with the same name', () => {
    const first = upsertGuestCustomTargetProfile(emptyNutrientGuestStore(), {
      name: '  My veg tank  ',
      target_ppm: { N: 100 },
    });
    const second = upsertGuestCustomTargetProfile(first.store, {
      name: 'my veg tank',
      target_ppm: { N: 80, P: 40 },
    });
    expect(second.store.customTargetProfiles).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.store.customTargetProfiles?.[0]?.target_ppm.N).toBe(80);
    expect(guestCustomTargetSlug(second.id)).toMatch(/^guest-target:/);
  });

  it('persists in guest store with slug prefix', () => {
    const { store, id } = upsertGuestCustomTargetProfile(emptyNutrientGuestStore(), {
      name: 'My veg tank',
      target_ppm: { N: 100, K: 80 },
      overdose_pct: defaultCustomTargetOverdosePct(),
    });
    expect(store.customTargetProfiles).toHaveLength(1);
    expect(guestCustomTargetSlug(id)).toMatch(/^guest-target:/);
  });
});
