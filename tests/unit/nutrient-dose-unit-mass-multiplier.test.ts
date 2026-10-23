import { describe, expect, it } from 'vitest';
import {
  doseMassMultiplierFromSpec,
  mapDbProductsToFertilizerSpecs,
  solveReverse,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
} from '@growlog/nutrient-calc';

describe('doseMassMultiplier respects saved dose unit', () => {
  it('g_per_L dose on liquid catalog product does not apply density', () => {
    const row: DbFertilizerProductRow = {
      id: 'p1',
      external_key: 'plagron|hydro a',
      brand: 'Plagron',
      name: 'HYDRO A',
      physical_form: 'liquid',
      dose_unit: 'ml_per_L',
      metadata: {
        provenance_class: 'manufacturer_label',
        density_g_ml: 1.18,
        n_total_includes_forms: true,
      },
    };
    const lines: DbCompositionLineRow[] = [
      { product_id: 'p1', form_key: 'NO3', value_pct: 3.2 },
    ];
    const fert = mapDbProductsToFertilizerSpecs([row], lines)[0];
    expect(doseMassMultiplierFromSpec(fert)).toBeCloseTo(1.18, 2);
    expect(doseMassMultiplierFromSpec(fert, 'g_per_L')).toBe(1);

    const liquid = solveReverse({
      doses: [{ fertilizer: fert, amountPerL: 1, unit: 'ml_per_L' }],
      options: { model: 'canonical' },
    });
    const mass = solveReverse({
      doses: [{ fertilizer: fert, amountPerL: 1, unit: 'g_per_L' }],
      options: { model: 'canonical' },
    });
    const nLiquid = (liquid.achievedPpm as Record<string, number>).N_NO3 ?? 0;
    const nMass = (mass.achievedPpm as Record<string, number>).N_NO3 ?? 0;
    expect(nLiquid).toBeCloseTo(37.8, 0);
    expect(nMass).toBeCloseTo(32, 0);
    expect(nLiquid / nMass).toBeCloseTo(1.18, 2);
  });
});
