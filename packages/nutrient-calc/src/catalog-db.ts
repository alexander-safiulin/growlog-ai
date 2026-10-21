import type { DeclaredComposition, FertilizerSpec, TargetPpm } from './types';

/** Row shapes mirroring ADR-014 Supabase tables (global catalog). */
export interface DbFertilizerProductRow {
  id: string;
  external_key: string;
  brand: string;
  name: string;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  metadata?: Record<string, unknown>;
}

export interface DbCompositionLineRow {
  product_id: string;
  form_key: string;
  value_pct: number;
}

export interface DbTargetProfileRow {
  slug: string;
  name: string;
  target_ppm: Record<string, number>;
  overdose_pct?: Record<string, number>;
}

export function compositionLinesToDeclared(
  lines: DbCompositionLineRow[],
  productId: string,
): DeclaredComposition {
  const declared: DeclaredComposition = {};
  for (const line of lines) {
    if (line.product_id !== productId) continue;
    declared[line.form_key] = line.value_pct;
  }
  return declared;
}

export function mapDbProductToFertilizerSpec(
  product: DbFertilizerProductRow,
  lines: DbCompositionLineRow[],
): FertilizerSpec {
  return {
    id: product.id,
    brand: product.brand,
    name: product.name,
    physicalForm: product.physical_form,
    doseUnit: product.dose_unit,
    declaredPct: compositionLinesToDeclared(lines, product.id),
    elementalPct: {},
  };
}

export function mapDbProductsToFertilizerSpecs(
  products: DbFertilizerProductRow[],
  lines: DbCompositionLineRow[],
): FertilizerSpec[] {
  return products.map((p) => mapDbProductToFertilizerSpec(p, lines));
}

export function mapDbProfileToTarget(profile: DbTargetProfileRow): TargetPpm {
  return profile.target_ppm as TargetPpm;
}
