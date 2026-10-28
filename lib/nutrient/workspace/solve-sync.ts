import { solveForward, solveMagicWand, type SolveForwardResult } from '@growlog/nutrient-calc';
import { padSolveForwardResultWithSelectedDoses } from '@/lib/nutrient/pad-solution-selected-doses';
import { buildSolveInput, type NutrientSolveParams } from './hooks';

/** Phone has no web worker. Solve the chosen salts against the chosen target on the JS thread. */
export function solveNutrientSelection(params: NutrientSolveParams): SolveForwardResult | null {
  const input = buildSolveInput({
    ...params,
    substituteCatalogIds: params.selectedProductIds,
  });
  if (!input) return null;
  let result: SolveForwardResult | null = null;
  try {
    result = solveMagicWand(input);
  } catch {
    try {
      result = solveForward(input);
    } catch {
      return null;
    }
  }
  if (!result) return null;
  return padSolveForwardResultWithSelectedDoses(
    result,
    input.fertilizers,
    params.selectedProductIds,
    input.options?.volumeL,
  );
}
