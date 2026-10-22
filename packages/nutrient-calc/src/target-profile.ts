import {
  forwardPpmFromCatalogRecipeLines,
  mapDbProductsToFertilizerSpecs,
  type DbCatalogRecipeLineRow,
  type DbFertilizerProductRow,
  type DbTargetProfileRow,
} from './catalog-db';
import { solveForward } from './solve-forward';
import type { FertilizerSpec, SolveForwardInput, SolveForwardResult, TargetPpm } from './types';
import { declaredToElemental } from './oxide';

/** Map DB `target_ppm` jsonb keys to canonical solver keys (already canonical in seed). */
export function targetPpmFromDbProfile(profile: DbTargetProfileRow): TargetPpm {
  return { ...profile.target_ppm };
}

export function fertilizerSpecsFromCatalogSaltLines(
  lines: DbCatalogRecipeLineRow[],
): FertilizerSpec[] {
  return lines.map((line, i) => {
    const { pct } = declaredToElemental(line.declared_pct);
    return {
      id: `catalog-salt:${line.ingredient_label}:${i}`,
      name: line.ingredient_label,
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: line.declared_pct,
      elementalPct: pct,
      metadata: { solubility_key: line.ingredient_label },
    };
  });
}

export interface SolveToTargetProfileInput {
  profile: DbTargetProfileRow;
  fertilizers: FertilizerSpec[];
  water?: TargetPpm | Record<string, number>;
  options?: SolveForwardInput['options'];
}

/** Forward solve using any catalog (or custom) target profile row. */
export function solveForwardToTargetProfile(input: SolveToTargetProfileInput): SolveForwardResult {
  return solveForward({
    target: targetPpmFromDbProfile(input.profile),
    water: input.water,
    fertilizers: input.fertilizers,
    options: input.options,
  });
}

export interface ClassicRecipeReproductionInput {
  profile: DbTargetProfileRow;
  lines: DbCatalogRecipeLineRow[];
  model?: 'canonical' | 'hydroodo_legacy';
  macroToleranceFraction?: number;
}

/**
 * Reproduce a classic macro profile from pure salt lines (reverse check).
 * Returns forward ppm and whether macros are within tolerance vs profile.
 */
export function reproduceClassicRecipeFromSalts(input: ClassicRecipeReproductionInput): {
  forwardPpm: Record<string, number>;
  withinTolerance: boolean;
  maxRelativeError: number;
} {
  const tol = input.macroToleranceFraction ?? 0.05;
  const forwardPpm = forwardPpmFromCatalogRecipeLines(
    input.lines,
    input.model ?? 'canonical',
  );
  const target = targetPpmFromDbProfile(input.profile);
  let maxRel = 0;
  for (const [key, t] of Object.entries(target)) {
    if (t <= 0) continue;
    if (['Fe', 'B', 'Mn', 'Zn', 'Cu', 'Mo', 'Co'].includes(key)) continue;
    const actual =
      key === 'N_NO3' ? (forwardPpm.N_NO3 ?? forwardPpm.N ?? 0) : (forwardPpm[key] ?? 0);
    const rel = Math.abs(actual - t) / t;
    maxRel = Math.max(maxRel, rel);
  }
  return {
    forwardPpm,
    withinTolerance: maxRel <= tol,
    maxRelativeError: maxRel,
  };
}

export function solveForwardWithCatalogProducts(
  profile: DbTargetProfileRow,
  products: DbFertilizerProductRow[],
  compositionLines: import('./catalog-db').DbCompositionLineRow[],
  options?: SolveForwardInput['options'],
): SolveForwardResult {
  const fertilizers = mapDbProductsToFertilizerSpecs(products, compositionLines);
  return solveForwardToTargetProfile({ profile, fertilizers, options });
}
