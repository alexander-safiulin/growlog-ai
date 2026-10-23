import { describe, expect, it } from 'vitest';
import { ruProductSentenceCase } from '@/lib/nutrient/ru-product-sentence-case';
import { productDisplayName } from '@/lib/nutrient/product-display-names';

describe('ruProductSentenceCase', () => {
  it('sentence-cases Russian DB-style names', () => {
    expect(ruProductSentenceCase('КАЛЬЦИЕВАЯ СЕЛИТРА')).toBe('Кальциевая селитра');
    expect(ruProductSentenceCase('МОНОФОСФАТ КАЛИЯ')).toBe('Монофосфат калия');
  });

  it('preserves brands, acronyms, and formula tokens', () => {
    expect(ruProductSentenceCase('Coco HC A')).toBe('Coco HC A');
    expect(ruProductSentenceCase('Хелат железа (EDTA)')).toBe('Хелат железа (EDTA)');
    expect(ruProductSentenceCase('Сульфат магния (MgSO₄)')).toContain('MgSO₄');
  });
});

describe('productDisplayName (ru)', () => {
  it('applies sentence case to generated RU catalog names', () => {
    const name = productDisplayName(
      'hydrobuddy|5ca-no3-2-nh4no3-10h2o',
      'Calcium Nitrate',
      'ru',
    );
    expect(name).toBe('Кальциевая селитра');
  });

  it('uses override for monopotassium phosphate', () => {
    expect(productDisplayName('hydrobuddy|kh2po4', 'KH2PO4', 'ru')).toBe('Монофосфат калия');
  });
});
