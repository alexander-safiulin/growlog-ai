import { describe, expect, it } from 'vitest';
import { productMatchesSearch } from '@/lib/nutrient/product-search';
import type { UnifiedProduct } from '@/lib/nutrient/unified-products';

const farmProduct = (name: string, brand: string): UnifiedProduct => ({
  id: 'farm:1',
  scope: 'farm',
  external_key: 'farm:170000',
  brand,
  name,
  physical_form: 'solid',
  dose_unit: 'g_per_L',
  lines: [{ form_key: 'Mg', value_pct: 10, n_form: null }],
});

describe('productMatchesSearch', () => {
  it('finds farm product by mixed-case name', () => {
    const p = farmProduct('MyCalMag', 'Farm');
    expect(productMatchesSearch(p, 'mycalmag', 'en')).toBe(true);
    expect(productMatchesSearch(p, 'MyCal', 'en')).toBe(true);
  });

  it('finds by brand case-insensitively', () => {
    const p = farmProduct('Blend', 'ACME Grow');
    expect(productMatchesSearch(p, 'acme', 'en')).toBe(true);
  });
});
