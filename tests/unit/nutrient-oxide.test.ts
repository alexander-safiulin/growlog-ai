import { describe, expect, it } from 'vitest';
import {
  CANONICAL_NA2O_FACTOR,
  declaredToElemental,
  HYDROODO_LEGACY_NA2O_FACTOR,
} from '@growlog/nutrient-calc';

describe('oxide conversion', () => {
  it('uses canonical Na2O factor (~0.742), not Hydroodo 0.56', () => {
    expect(CANONICAL_NA2O_FACTOR).toBeCloseTo(0.7416, 3);
    expect(CANONICAL_NA2O_FACTOR).not.toBeCloseTo(HYDROODO_LEGACY_NA2O_FACTOR, 2);
  });

  it('avoids nitrogen double count when total N and forms coexist', () => {
    const { pct, warnings } = declaredToElemental({
      N: 1,
      NO3: 0.4,
      NH4: 0.6,
      P2O5: 5,
    });
    expect(warnings).toContain('nitrogen_total_over_forms');
    expect((pct.N_NO3 ?? 0) + (pct.N_NH4 ?? 0)).toBeCloseTo(1, 3);
  });

  it('marks nitrogen form unknown when only total N is declared', () => {
    const { warnings } = declaredToElemental({ N: 11.6, Ca: 16.6 });
    expect(warnings).toContain('nitrogen_form_unknown');
  });
});
