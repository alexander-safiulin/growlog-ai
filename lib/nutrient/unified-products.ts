import {
  mapDbProductsToFertilizerSpecs,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';
import type { CatalogBundle } from './catalog-types';
import { activeCatalogFertilizers } from './catalog-deprecated';
import type { FarmFertilizerRow } from '@growlog/domain';
import {
  compositionLinesEqual,
  isCompositionEdited,
  splitFarmCompositionOverrides,
} from './fertilizer-composition-override';

export type UnifiedProductScope = 'catalog' | 'farm';

export type UnifiedCompositionLine = {
  form_key: string;
  value_pct: number;
  n_form?: string | null;
};

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
  lines: UnifiedCompositionLine[];
  /** Catalog composition before a farm override. Present on catalog rows. */
  sourceLines?: UnifiedCompositionLine[];
  /** User changed these percents. Catalog originals stay in the global catalog. */
  compositionEdited?: boolean;
  /** Farm product id that stores a catalog composition override. */
  compositionOverrideId?: string;
  density_g_per_ml?: number | null;
  label_basis?: 'w_w' | 'w_v' | null;
}

export function mergeCatalogAndFarmProducts(
  catalog: CatalogBundle,
  farmProducts: FarmFertilizerRow[],
  farmLines: Record<string, UnifiedCompositionLine[]>,
): UnifiedProduct[] {
  const { overrides, own } = splitFarmCompositionOverrides(farmProducts);
  const catalogRows: UnifiedProduct[] = activeCatalogFertilizers(catalog.fertilizers).map((p) => {
    const sourceLines = p.lines;
    const override = overrides.get(p.id);
    const overrideLines = override ? (farmLines[override.id] ?? []) : null;
    const edited = overrideLines != null && !compositionLinesEqual(overrideLines, sourceLines);
    return {
      id: p.id,
      scope: 'catalog' as const,
      external_key: p.external_key,
      brand: p.brand,
      name: p.name,
      physical_form: p.physical_form,
      dose_unit: p.dose_unit,
      source_id: p.source_id,
      trust_level: p.trust_level,
      metadata: p.metadata,
      lines: edited && overrideLines ? overrideLines : sourceLines,
      sourceLines,
      compositionEdited: edited,
      compositionOverrideId: override?.id,
    };
  });
  const farmRows: UnifiedProduct[] = own.map((p) => ({
    id: `farm:${p.id}`,
    scope: 'farm',
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    metadata: p.metadata,
    lines: farmLines[p.id] ?? [],
    compositionEdited: isCompositionEdited(p.metadata),
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
