import { describe, expect, it } from 'vitest';
import {
  detectNTotalIncludesForms,
  externalKey,
  normalizeHydroodoComponents,
} from '../../scripts/nutrient-import/hydroodo-normalize';

describe('Hydroodo normalize', () => {
  it('merges Буйские duplicate keys into aliases', () => {
    const components = [
      {
        brand: 'Буйские Удобрения',
        name: 'Сульфат Калия',
        declared_pct: { K2O: 53 },
      },
      {
        brand: 'Буйские Удобрения',
        name: 'Калий сернокислый (сульфат калия)',
        declared_pct: { K2O: 53 },
      },
      {
        brand: 'Буйские Удобрения',
        name: 'Кальциевая селитра',
        declared_pct: { NO3: 11.6, Ca: 16.6 },
      },
      {
        brand: 'Буйские Удобрения',
        name: 'Селитра Кальциевая',
        declared_pct: { N: 11.6, Ca: 16.6 },
      },
    ];
    const { products, aliases } = normalizeHydroodoComponents(components);
    expect(products).toHaveLength(2);
    expect(aliases).toHaveLength(2);
    const k2so4 = products.find((p) => p.external_key === externalKey('Буйские Удобрения', 'Сульфат Калия'));
    expect(k2so4?.declared_pct.S).toBe(18);
    expect(k2so4?.metadata.corrected_from_hydroodo).toBeTruthy();
  });

  it('detects N total + forms double-count pattern', () => {
    expect(detectNTotalIncludesForms({ N: 10, NO3: 5 })).toBe(true);
    expect(detectNTotalIncludesForms({ NO3: 5 })).toBe(false);
  });
});
