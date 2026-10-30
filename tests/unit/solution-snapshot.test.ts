import { describe, expect, it } from 'vitest';
import {
  appliedElementsMg,
  buildGuestSolutionSnapshot,
  feedLogCompositionTrustedSync,
  feedingDosesMatchRecipe,
} from '@growlog/domain';
import { dosesFromRecipeLines } from '@growlog/domain';

describe('solution snapshot', () => {
  it('computes applied element mass from ppm and volume', () => {
    const mg = appliedElementsMg({ elements_mg_per_l: { N: 150, K: 200 } }, 2000);
    expect(mg).toEqual({ N: 300, K: 400 });
  });

  it('builds guest snapshot with composition when trusted', () => {
    const snap = buildGuestSolutionSnapshot({
      recipeId: 'r1',
      name: 'Veg mix',
      solutionKind: 'working',
      inputs: {
        _solverResult: {
          best: {
          achievedPpm: { N: 120 },
          ecEstimateMsCm: 1.8,
          doses: [{ fertilizerName: 'CalNit', amountPerL: 0.8, fertilizerId: 'p1', unit: 'g_per_L', tank: 'single' }],
        },
        },
      },
      includeComposition: true,
    });
    expect(snap.elements_mg_per_l).toEqual({ N: 120 });
    expect(snap.ec_ms_calculated).toBe(1.8);
    expect(snap.doses_per_l).toEqual([
      {
        product_label: 'CalNit',
        dose_per_l: 0.8,
        unit: 'g_per_L',
        tank: 'single',
        fertilizer_product_id: 'p1',
        farm_fertilizer_product_id: null,
      },
    ]);
  });

  it('trusts watering with any doses when recipe linked', () => {
    expect(
      feedLogCompositionTrustedSync({
        entryKind: 'watering',
        recipeId: 'r1',
        volumeMl: 1000,
        recipeVolumeL: 1,
        doses: [{ productLabel: 'X', amountMl: '99', autoScaled: false }],
        recipeLines: [],
      }),
    ).toBe(true);
  });

  it('rejects extra manual dose rows vs recipe', () => {
    const lines = [
      {
        fertilizer_label: 'A',
        dose_per_l: 2,
        fertilizer_product_id: null,
        farm_fertilizer_product_id: null,
      },
    ];
    const expected = dosesFromRecipeLines(lines, 1000, 1);
    expect(
      feedLogCompositionTrustedSync({
        entryKind: 'feeding',
        recipeId: 'r1',
        volumeMl: 1000,
        recipeVolumeL: 1,
        doses: [...expected, { productLabel: 'Extra', amountMl: '1', autoScaled: false }],
        recipeLines: lines,
      }),
    ).toBe(false);
  });

  it('detects manual dose edits vs recipe scaling', () => {
    const lines = [
      {
        fertilizer_label: 'A',
        dose_per_l: 2,
        fertilizer_product_id: null,
        farm_fertilizer_product_id: null,
      },
    ];
    const expected = dosesFromRecipeLines(lines, 1000, 1);
    expect(feedingDosesMatchRecipe(expected, lines, 1000, 1)).toBe(true);
    const edited = [{ ...expected[0], amountMl: '999', autoScaled: false }];
    expect(feedingDosesMatchRecipe(edited, lines, 1000, 1)).toBe(false);
  });
});
