import { describe, expect, it } from 'vitest';
import { emptyNutrientGuestStore, type FarmFertilizerRow } from '@growlog/domain';
import { applyGuestCompositionEdit } from '@/lib/nutrient/guest/guest-workspace-actions';
import {
  compositionLinesEqual,
  compositionLinesFromDraft,
} from '@/lib/nutrient/fertilizer-composition-override';
import { mergeCatalogAndFarmProducts } from '@/lib/nutrient/unified-products';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';

const catalog = {
  version: 1,
  sources: [],
  target_profiles: [],
  fertilizers: [
    {
      id: 'k2so4',
      external_key: 'k2so4',
      brand: 'Buiskie',
      name: 'Potassium sulfate',
      physical_form: 'solid' as const,
      dose_unit: 'g_per_L' as const,
      source_id: 'src',
      trust_level: 'community',
      lines: [
        { form_key: 'K2O', value_pct: 50 },
        { form_key: 'SO3', value_pct: 45 },
      ],
    },
  ],
} satisfies CatalogBundle;

function farmProduct(partial: Partial<FarmFertilizerRow> & Pick<FarmFertilizerRow, 'id' | 'metadata'>): FarmFertilizerRow {
  return {
    farm_id: 'farm-1',
    external_key: partial.external_key ?? partial.id,
    brand: 'Buiskie',
    name: 'Potassium sulfate',
    physical_form: 'solid',
    dose_unit: 'g_per_L',
    density_g_per_ml: null,
    label_basis: null,
    ...partial,
  };
}

describe('fertilizer composition overrides', () => {
  it('keeps the catalog id and swaps in edited percents', () => {
    const products = mergeCatalogAndFarmProducts(
      catalog,
      [
        farmProduct({
          id: 'ov1',
          external_key: 'catalog-override:k2so4',
          metadata: { overrides_catalog_product_id: 'k2so4', composition_edited: true },
        }),
        farmProduct({
          id: 'mine',
          external_key: 'farm:mine',
          brand: '',
          name: 'My salt',
          metadata: { composition_edited: true },
        }),
      ],
      {
        ov1: [
          { form_key: 'K2O', value_pct: 52 },
          { form_key: 'SO3', value_pct: 45 },
        ],
        mine: [{ form_key: 'CaO', value_pct: 15 }],
      },
    );

    expect(products.map((product) => product.id)).toEqual(['k2so4', 'farm:mine']);
    const catalogRow = products[0];
    expect(catalogRow?.lines).toEqual([
      { form_key: 'K2O', value_pct: 52 },
      { form_key: 'SO3', value_pct: 45 },
    ]);
    expect(catalogRow?.sourceLines).toEqual(catalog.fertilizers[0]?.lines);
    expect(catalogRow?.compositionEdited).toBe(true);
    expect(catalogRow?.compositionOverrideId).toBe('ov1');
    expect(products[1]?.compositionEdited).toBe(true);
    expect(products[1]?.scope).toBe('farm');
  });

  it('does not mark an override edited when the percents match the catalog', () => {
    const products = mergeCatalogAndFarmProducts(
      catalog,
      [
        farmProduct({
          id: 'ov1',
          metadata: { overrides_catalog_product_id: 'k2so4' },
        }),
      ],
      {
        ov1: [
          { form_key: 'SO3', value_pct: 45 },
          { form_key: 'K2O', value_pct: 50 },
        ],
      },
    );
    expect(products).toHaveLength(1);
    expect(products[0]?.compositionEdited).toBe(false);
    expect(products[0]?.lines).toEqual(catalog.fertilizers[0]?.lines);
    expect(products[0]?.compositionOverrideId).toBe('ov1');
  });

  it('stores a guest catalog correction separately from the catalog id', () => {
    const saved = applyGuestCompositionEdit(emptyNutrientGuestStore(), {
      scope: 'catalog',
      unifiedId: 'k2so4',
      externalKey: 'k2so4',
      brand: 'Buiskie',
      name: 'Potassium sulfate',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      densityGPerMl: null,
      labelBasis: null,
      metadata: { trust: 'catalog' },
      lines: [{ form_key: 'K2O', value_pct: 52, n_form: null }],
      revertOverride: false,
    });
    expect(saved.fertilizers).toHaveLength(1);
    expect(saved.fertilizers[0]?.id).not.toBe('k2so4');
    expect(saved.fertilizers[0]?.metadata.overrides_catalog_product_id).toBe('k2so4');
    expect(saved.fertilizers[0]?.metadata.composition_edited).toBe(true);

    const again = applyGuestCompositionEdit(saved, {
      scope: 'catalog',
      unifiedId: 'k2so4',
      overrideId: saved.fertilizers[0]?.id,
      externalKey: 'k2so4',
      brand: 'Buiskie',
      name: 'Potassium sulfate',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      densityGPerMl: null,
      labelBasis: null,
      metadata: {},
      lines: [{ form_key: 'K2O', value_pct: 50, n_form: null }],
      revertOverride: true,
    });
    expect(again.fertilizers).toEqual([]);
  });

  it('marks a guest-owned salt edited without turning it into a catalog override', () => {
    const saved = applyGuestCompositionEdit(emptyNutrientGuestStore(), {
      scope: 'farm',
      unifiedId: 'farm:salt-1',
      externalKey: 'farm:salt-1',
      brand: '',
      name: 'My salt',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      densityGPerMl: null,
      labelBasis: null,
      metadata: { n_total_includes_forms: false },
      lines: [{ form_key: 'CaO', value_pct: 16, n_form: null }],
      revertOverride: false,
    });
    expect(saved.fertilizers[0]?.id).toBe('salt-1');
    expect(saved.fertilizers[0]?.metadata.composition_edited).toBe(true);
    expect(saved.fertilizers[0]?.metadata.overrides_catalog_product_id).toBeUndefined();
    expect(compositionLinesEqual(saved.fertilizers[0]?.lines ?? [], [{ form_key: 'CaO', value_pct: 16 }])).toBe(true);
  });

  it('drops a cleared percent and keeps nitrogen form on the keys that remain', () => {
    const lines = compositionLinesFromDraft(
      { N: '', NO3: '12,5', K2O: '0' },
      [
        { form_key: 'N', value_pct: 8, n_form: 'total' },
        { form_key: 'NO3', value_pct: 10, n_form: 'nitrate' },
      ],
    );
    expect(lines).toEqual([{ form_key: 'NO3', value_pct: 12.5, n_form: 'nitrate' }]);
  });
});
