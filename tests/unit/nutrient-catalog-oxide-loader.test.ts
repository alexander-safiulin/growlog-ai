import { describe, expect, it } from 'vitest';
import { filterOxideFactorsForModel, oxideFactorMapFromDb } from '@growlog/nutrient-calc';
import { CANONICAL_NA2O_FACTOR } from '@growlog/nutrient-calc';

const rows = [
  {
    form_key: 'Na2O',
    element_symbol: 'Na',
    factor: CANONICAL_NA2O_FACTOR,
    verification_status: 'spot_checked' as const,
  },
  {
    form_key: 'Na2O',
    element_symbol: 'Na',
    factor: 0.56,
    verification_status: 'known_error' as const,
  },
];

describe('catalog oxide factor loader', () => {
  it('drops known_error rows in canonical mode', () => {
    const filtered = filterOxideFactorsForModel(rows, 'canonical');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].factor).toBeCloseTo(CANONICAL_NA2O_FACTOR, 6);
    const map = oxideFactorMapFromDb(rows, 'canonical');
    expect(map.Na2O).toBeCloseTo(CANONICAL_NA2O_FACTOR, 6);
    expect(map.Na2O).not.toBe(0.56);
  });

  it('keeps legacy Hydroodo row in hydroodo_legacy mode', () => {
    const filtered = filterOxideFactorsForModel(rows, 'hydroodo_legacy');
    expect(filtered).toHaveLength(2);
  });
});
