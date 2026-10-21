import {
  buildChemistryMatrix,
  collectGroups,
  type ChemistryModel,
} from './chemistry-matrix';
import { multiplyMatrixVector, stableSortFertilizers } from './matrix';
import { computeMatchScore, computeDeviations } from './deviations';
import { growlogMacroMatchPct } from './match-metric';
import type { ElementKey, FertilizerSpec, SolveReverseInput, SolveReverseResult } from './types';
import { DEFAULT_SOLVE_ELEMENTS, SOLVER_VERSION } from './types';

function resolveModel(
  options?: SolveReverseInput['options'],
  explicit?: ChemistryModel,
): ChemistryModel {
  if (explicit) return explicit;
  if (options && 'model' in options && options.model) return options.model as ChemistryModel;
  return 'hydroodo_legacy';
}

export function solveReverse(input: SolveReverseInput): SolveReverseResult {
  const warnings: string[] = [];
  const fertilizers = stableSortFertilizers(input.doses.map((d) => d.fertilizer));
  const model = resolveModel(input.options);
  const doseMap = new Map(input.doses.map((d) => [d.fertilizer.id, d.amountPerL] as const));
  const x = fertilizers.map((f) => doseMap.get(f.id) ?? 0);

  const target = (input.target ?? {}) as Record<string, number>;
  const groups = collectGroups(fertilizers, target, model);
  const A = buildChemistryMatrix(fertilizers, groups, model);
  const achievedVec = multiplyMatrixVector(A, x);
  const achievedPpm: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const w = (input.water as Record<string, number> | undefined)?.[groups[i]] ?? 0;
    const v = achievedVec[i] + w;
    if (v !== 0) achievedPpm[groups[i]] = v;
  }

  let matchScore: number | undefined;
  let deviations;
  if (input.target) {
    if (model === 'canonical') {
      const elements = DEFAULT_SOLVE_ELEMENTS.filter((e) => (target[e as string] ?? 0) > 0);
      deviations = computeDeviations(
        elements,
        input.target as Record<ElementKey, number>,
        achievedPpm as Record<ElementKey, number>,
        input.options?.tolerances,
      );
      matchScore = computeMatchScore(
        elements,
        input.target as Record<ElementKey, number>,
        achievedPpm as Record<ElementKey, number>,
        input.options?.tolerances,
      ).matchScore;
    } else {
      matchScore = growlogMacroMatchPct(input.target as Record<string, number>, achievedPpm) / 100;
    }
  }

  return {
    achievedPpm,
    deviations,
    matchScore,
    warnings,
    solverVersion: SOLVER_VERSION,
  };
}

export function solveReverseHydroodo(
  doses: Array<{ declaredPct: Record<string, number>; dosePerL: number; brand?: string; name?: string }>,
  water?: Record<string, number>,
): Record<string, number> {
  const fertilizers: FertilizerSpec[] = doses.map((d, i) => ({
    id: String(i),
    name: d.name ?? `f${i}`,
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: d.declaredPct,
    elementalPct: {},
  }));
  const groups = collectGroups(fertilizers, {}, 'hydroodo_legacy');
  const A = buildChemistryMatrix(fertilizers, groups, 'hydroodo_legacy');
  const x = doses.map((d) => d.dosePerL);
  const vec = multiplyMatrixVector(A, x);
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const w = water?.[groups[i]] ?? 0;
    const v = vec[i] + w;
    if (v !== 0) out[groups[i]] = v;
  }
  return out;
}
