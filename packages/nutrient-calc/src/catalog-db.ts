import type { ChemistryModel } from './chemistry-matrix';
import { declaredToElemental } from './oxide';
import type { DeclaredComposition, FertilizerSpec, TargetPpm } from './types';
import { buildChemistryMatrix, collectGroups } from './chemistry-matrix';
import { multiplyMatrixVector } from './matrix';

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

export interface DbOxideFactorRow {
  form_key: string;
  element_symbol: string;
  factor: number;
  verification_status?: 'verified' | 'spot_checked' | 'unverified' | 'known_error';
  trust_level?: string;
}

export interface DbTargetProfileRow {
  slug: string;
  name: string;
  target_ppm: Record<string, number>;
  overdose_pct?: Record<string, number>;
}

export interface DbCatalogRecipeLineRow {
  ingredient_label: string;
  dose_per_l: number;
  declared_pct: Record<string, number>;
}

export function filterOxideFactorsForModel(
  rows: DbOxideFactorRow[],
  model: ChemistryModel,
): DbOxideFactorRow[] {
  if (model === 'hydroodo_legacy') return rows;
  return rows.filter((r) => r.verification_status !== 'known_error');
}

export function oxideFactorMapFromDb(
  rows: DbOxideFactorRow[],
  model: ChemistryModel,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of filterOxideFactorsForModel(rows, model)) {
    map[row.form_key] = row.factor;
  }
  return map;
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
    metadata: product.metadata ?? {},
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

/** Forward ppm from catalog recipe salt lines (g/L doses, declared %). */
export function forwardPpmFromCatalogRecipeLines(
  lines: DbCatalogRecipeLineRow[],
  model: ChemistryModel,
  _oxideRows: DbOxideFactorRow[] = [],
): Record<string, number> {
  const ferts: FertilizerSpec[] = lines.map((line, i) => ({
    id: `catalog-line-${i}`,
    name: line.ingredient_label,
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: line.declared_pct,
    elementalPct: {},
  }));
  const doses = lines.map((l) => l.dose_per_l);
  const targetHint: Record<string, number> = {};
  const groups = collectGroups(ferts, targetHint, model);
  const A = buildChemistryMatrix(ferts, groups, model);
  const vec = multiplyMatrixVector(A, doses);
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    if (vec[i]) out[groups[i]] = vec[i];
  }
  return out;
}

export function declaredToElementalForModel(
  declared: DeclaredComposition,
  model: ChemistryModel,
  oxideRows: DbOxideFactorRow[] = [],
): ReturnType<typeof declaredToElemental> {
  void oxideRows;
  void model;
  return declaredToElemental(declared);
}
