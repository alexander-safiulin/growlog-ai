import {
  buildContributionMatrix,
  multiplyMatrixVector,
  stableSortFertilizers,
  targetToVector,
  vectorToTargetPpm,
} from './matrix';
import { hydroodoSumDoses } from './hydroodo-model';
import { computeDeviations, computeMatchScore } from './match-score';
import { growlogMacroMatchPct } from './match-metric';
import type { ElementKey, FertilizerSpec, SolveReverseInput, SolveReverseResult } from './types';
import { DEFAULT_SOLVE_ELEMENTS, SOLVER_VERSION } from './types';

function activeElements(
  target?: Record<string, number>,
  achieved?: Record<string, number>,
): ElementKey[] {
  const set = new Set<ElementKey>(DEFAULT_SOLVE_ELEMENTS);
  for (const key of Object.keys(target ?? {})) set.add(key as ElementKey);
  for (const key of Object.keys(achieved ?? {})) set.add(key as ElementKey);
  return DEFAULT_SOLVE_ELEMENTS.filter((e) => set.has(e));
}

function usesHydroodoChemistry(fertilizers: FertilizerSpec[]): boolean {
  return fertilizers.every((f) => f.declaredPct && Object.keys(f.declaredPct).length > 0);
}

export function solveReverse(input: SolveReverseInput): SolveReverseResult {
  const warnings: string[] = [];
  const fertilizers = stableSortFertilizers(input.doses.map((d) => d.fertilizer));

  if (usesHydroodoChemistry(fertilizers)) {
    const items = input.doses.map((d) => ({
      declared: d.fertilizer.declaredPct!,
      dosePerL: d.amountPerL,
    }));
    const waterItems = input.water
      ? Object.entries(input.water).map(([g, ppm]) => ({ group: g, ppm: ppm ?? 0 }))
      : [];

    const summed = hydroodoSumDoses(items);
    const achievedPpm: Record<string, number> = { ...summed.groupsMgL };
    for (const w of waterItems) {
      achievedPpm[w.group] = (achievedPpm[w.group] ?? 0) + w.ppm;
    }

    let matchScore: number | undefined;
    if (input.target) {
      matchScore = growlogMacroMatchPct(input.target, achievedPpm) / 100;
    }

    return {
      achievedPpm,
      matchScore,
      warnings,
      solverVersion: SOLVER_VERSION,
    };
  }

  const doseMap = new Map(
    input.doses.map((d) => [d.fertilizer.id, d.amountPerL] as const),
  );
  const x = fertilizers.map((f) => doseMap.get(f.id) ?? 0);
  const elements = activeElements(input.target, input.water);
  const A = buildContributionMatrix(fertilizers, elements);
  const achievedVec = multiplyMatrixVector(A, x);
  const waterVec = targetToVector(elements, input.water ?? {});
  for (let i = 0; i < achievedVec.length; i++) achievedVec[i] += waterVec[i];

  const achievedPpm = vectorToTargetPpm(elements, achievedVec);

  let deviations;
  let matchScore;
  if (input.target) {
    deviations = computeDeviations(
      elements,
      input.target as Partial<Record<ElementKey, number>>,
      achievedPpm,
      input.options?.tolerances,
    );
    const scored = computeMatchScore(
      elements,
      input.target as Partial<Record<ElementKey, number>>,
      achievedPpm,
      input.options?.tolerances,
    );
    matchScore = scored.matchScore;
  }

  return {
    achievedPpm,
    deviations,
    matchScore,
    warnings,
    solverVersion: SOLVER_VERSION,
  };
}

/** Hydroodo forward: macro mg/L from declared % and doses (GUI formula). */
export function solveReverseHydroodo(
  doses: Array<{ declaredPct: import('./types').DeclaredComposition; dosePerL: number }>,
  water?: Record<string, number>,
): Record<string, number> {
  const summed = hydroodoSumDoses(
    doses.map((d) => ({ declared: d.declaredPct, dosePerL: d.dosePerL })),
  );
  const out: Record<string, number> = { ...summed.groupsMgL };
  if (water) {
    for (const [g, ppm] of Object.entries(water)) {
      out[g] = (out[g] ?? 0) + (ppm ?? 0);
    }
  }
  return out;
}
