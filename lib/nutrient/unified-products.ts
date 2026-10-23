import {
  mapDbProductsToFertilizerSpecs,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';
import type { CatalogBundle } from './catalog-types';
import type { FarmFertilizerRow } from '@growlog/domain';

export type UnifiedProductScope = 'catalog' | 'farm';

export interface UnifiedProduct {
  id: string;
  scope: UnifiedProductScope;
  external_key: string;
  brand: string;
  name: string;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  source_id?: string;
  trust_level?: string;
  metadata?: Record<string, unknown>;
  lines: Array<{ form_key: string; value_pct: number; n_form?: string | null }>;
  density_g_per_ml?: number | null;
  label_basis?: 'w_w' | 'w_v' | null;
}

export function mergeCatalogAndFarmProducts(
  catalog: CatalogBundle,
  farmProducts: FarmFertilizerRow[],
  farmLines: Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>>,
): UnifiedProduct[] {
  const catalogRows: UnifiedProduct[] = catalog.fertilizers
    .filter((p) => !(p.metadata as Record<string, unknown> | undefined)?.catalog_deprecated)
    .map((p) => ({
    id: p.id,
    scope: 'catalog',
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    source_id: p.source_id,
    trust_level: p.trust_level,
    metadata: p.metadata,
    lines: p.lines,
  }));
  const farmRows: UnifiedProduct[] = farmProducts.map((p) => ({
    id: `farm:${p.id}`,
    scope: 'farm',
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    metadata: p.metadata,
    lines: farmLines[p.id] ?? [],
    density_g_per_ml: p.density_g_per_ml,
    label_basis: p.label_basis,
  }));
  return [...catalogRows, ...farmRows];
}

export function unifiedToFertilizerSpecs(products: UnifiedProduct[]): FertilizerSpec[] {
  const rows: DbFertilizerProductRow[] = products.map((p) => ({
    id: p.id,
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    metadata: {
      ...(p.metadata ?? {}),
      density_g_per_ml: p.density_g_per_ml,
      label_basis: p.label_basis,
      scope: p.scope,
    },
  }));
  const lines: DbCompositionLineRow[] = products.flatMap((p) =>
    p.lines.map((l) => ({
      product_id: p.id,
      form_key: l.form_key,
      value_pct: l.value_pct,
    })),
  );
  return mapDbProductsToFertilizerSpecs(rows, lines);
}
