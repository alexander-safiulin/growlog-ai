import { solveForward, solveMagicWand, type SolveForwardResult } from '@growlog/nutrient-calc';
import { buildSolveInput, type NutrientSolveParams } from './hooks';

/** Phone has no web worker. Solve the chosen salts against the chosen target on the JS thread. */
export function solveNutrientSelection(params: NutrientSolveParams): SolveForwardResult | null {
  const input = buildSolveInput({
    ...params,
    substituteCatalogIds: params.selectedProductIds,
  });
  if (!input) return null;
  try {
    return solveMagicWand(input);
  } catch {
    try {
      return solveForward(input);
    } catch {
      return null;
    }
  }
}
