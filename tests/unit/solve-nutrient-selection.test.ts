import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { defaultNutrientWorkspaceProductIds } from '@/lib/nutrient/default-fertilizers';
import { mergeCatalogAndFarmProducts } from '@/lib/nutrient/unified-products';
import { solveNutrientSelection } from '@/lib/nutrient/workspace/solve-sync';

const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');
const catalog = JSON.parse(readFileSync(bundlePath, 'utf8')) as CatalogBundle;

describe('solveNutrientSelection', () => {
  it('returns positive doses for a catalog target and selected salts', () => {
    const unifiedProducts = mergeCatalogAndFarmProducts(catalog, [], {});
    const result = solveNutrientSelection({
      catalog,
      unifiedProducts,
      selectedProductIds: defaultNutrientWorkspaceProductIds(catalog),
      catalogProfileSlug: 'hoagland-standard',
      volumeL: 100,
      model: 'canonical',
      tankMode: 'ab',
      stockFactor: 100,
    });
    expect(result?.best.doses.some((d) => d.amountPerL > 0)).toBe(true);
    const selected = defaultNutrientWorkspaceProductIds(catalog);
    for (const id of selected) {
      expect(result?.best.doses.some((d) => d.fertilizerId === id)).toBe(true);
    }
  });
});
