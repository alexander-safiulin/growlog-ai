import {
  buildContributionMatrix,
  multiplyMatrixVector,
  netTargetAfterWater,
  stableSortFertilizers,
  targetToVector,
  vectorToTargetPpm,
} from './matrix';
import { buildHydroodoMatrix } from './hydroodo-model';
import { computeDeviations, computeMatchScore } from './match-score';
import {
  growlogMacroMatchPct,
  weightedMacroDeviation,
  withinOverdoseCaps,
} from './match-metric';
import { computeObjective, DEFAULT_SOLVER_OBJECTIVE } from './objective';
import { solveCapAwareCoordinate } from './solve-optimize';
import type {
  Dose,
  ElementKey,
  FertilizerSpec,
  SolveForwardInput,
  SolveForwardResult,
  SolveSolution,
  TargetPpm,
} from './types';
import { DEFAULT_SOLVE_ELEMENTS, SOLVER_VERSION } from './types';

const HYDROODO_DOSE_STEP = 0.001;

function roundDose(value: number, decimals: number): number {
  const step = decimals === 3 ? HYDROODO_DOSE_STEP : 10 ** -decimals;
  return Math.round(value / step) * step;
}

function usesHydroodo(fertilizers: FertilizerSpec[]): boolean {
  return fertilizers.every((f) => f.declaredPct && Object.keys(f.declaredPct).length > 0);
}

function targetGroups(target: Record<string, number>): string[] {
  const keys = Object.keys(target).filter((k) => (target[k] ?? 0) > 0);
  const order = [
    'N',
    'N_NO3',
    'N_NH4',
    'N_UREA',
    'P',
    'K',
    'Ca',
    'Mg',
    'S',
    'B',
    'Fe',
    'Mn',
    'Zn',
    'Cu',
    'Mo',
    'Co',
    'Na',
    'Cl',
  ];
  return [...order.filter((k) => keys.includes(k)), ...keys.filter((k) => !order.includes(k))];
}

function buildSolution(
  fertilizers: FertilizerSpec[],
  groups: string[],
  x: number[],
  fullTarget: Record<string, number>,
  netTarget: Record<string, number>,
  water: Record<string, number> | undefined,
  options: SolveForwardInput['options'],
  weightedError: number,
  hydroodo: boolean,
): SolveSolution {
  const A = hydroodo
    ? buildHydroodoMatrix(
        fertilizers.map((f) => ({ declaredPct: f.declaredPct! })),
        groups,
      )
    : buildContributionMatrix(fertilizers, groups as ElementKey[]);

  const achievedVec = multiplyMatrixVector(A, x);
  const waterVec = groups.map((g) => water?.[g] ?? 0);
  for (let i = 0; i < achievedVec.length; i++) achievedVec[i] += waterVec[i];

  const achievedPpm: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    if (achievedVec[i] !== 0) achievedPpm[groups[i]] = achievedVec[i];
  }

  const tolerances = options?.tolerances;
  const deviations = hydroodo
    ? []
    : computeDeviations(
        groups as ElementKey[],
        fullTarget as TargetPpm,
        achievedPpm as TargetPpm,
        tolerances,
      );

  const matchScore = hydroodo
    ? growlogMacroMatchPct(fullTarget, achievedPpm) / 100
    : computeMatchScore(
        groups as ElementKey[],
        netTarget as TargetPpm,
        achievedPpm as TargetPpm,
        tolerances,
      ).matchScore;

  const decimals = options?.doseDecimals ?? (hydroodo ? 3 : 4);
  const volumeL = options?.volumeL;

  const doses: Dose[] = [];
  for (let j = 0; j < fertilizers.length; j++) {
    if (x[j] <= 1e-8) continue;
    const fert = fertilizers[j];
    const amountPerL = roundDose(x[j], decimals);
    doses.push({
      fertilizerId: fert.id,
      fertilizerName: fert.name,
      amountPerL,
      unit: fert.doseUnit,
      tank: fert.tank ?? 'single',
      amountTotal: volumeL != null ? roundDose(amountPerL * volumeL, decimals) : undefined,
    });
  }

  const warnings: string[] = [];
  const overdose = options?.overdosePctByGroup;
  if (overdose && !withinOverdoseCaps(fullTarget, achievedPpm, overdose)) {
    warnings.push('overdose_cap_exceeded');
  }

  return {
    doses,
    achievedPpm,
    deviations,
    matchScore,
    weightedError,
    warnings,
  };
}

function solveOnce(
  fertilizers: FertilizerSpec[],
  groups: string[],
  fullTarget: Record<string, number>,
  netTarget: Record<string, number>,
  water: Record<string, number> | undefined,
  options: SolveForwardInput['options'],
  excludeIds: Set<string>,
  hydroodo: boolean,
): SolveSolution | null {
  const active = fertilizers.filter((f) => !excludeIds.has(f.id));
  if (active.length === 0) return null;

  const A = hydroodo
    ? buildHydroodoMatrix(
        active.map((f) => ({ declaredPct: f.declaredPct! })),
        groups,
      )
    : buildContributionMatrix(active, groups as ElementKey[]);

  const x = solveCapAwareCoordinate(active, groups, netTarget, hydroodo, options);
  const achievedCheck = multiplyMatrixVector(A, x);
  const achievedMap: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) achievedMap[groups[i]] = achievedCheck[i];

  const obj = computeObjective(
    groups,
    netTarget,
    achievedMap,
    options?.objective ?? DEFAULT_SOLVER_OBJECTIVE,
  );
  const weightedError = Math.sqrt(obj);

  return buildSolution(
    active,
    groups,
    x,
    fullTarget,
    netTarget,
    water,
    options,
    weightedError,
    hydroodo,
  );
}

function solutionKey(sol: SolveSolution): string {
  return sol.doses
    .map((d) => `${d.fertilizerId}:${d.amountPerL}`)
    .sort()
    .join('|');
}

export function solveForward(input: SolveForwardInput): SolveForwardResult {
  const fertilizers = stableSortFertilizers(input.fertilizers);
  const hydroodo = usesHydroodo(fertilizers);
  const fullTarget = input.target as Record<string, number>;
  const water = input.water as Record<string, number> | undefined;
  const netTarget = netTargetAfterWater(fullTarget as TargetPpm, water as TargetPpm) as Record<
    string,
    number
  >;

  const groups = hydroodo
    ? targetGroups(netTarget)
    : DEFAULT_SOLVE_ELEMENTS.filter((el) => (netTarget[el as string] ?? 0) > 0);

  const solveGroups =
    groups.length > 0
      ? groups
      : hydroodo
        ? targetGroups(fullTarget)
        : [...DEFAULT_SOLVE_ELEMENTS];

  const options = input.options;
  const maxAlt = Math.max(1, Math.min(options?.maxAlternatives ?? 3, 5));

  const best = solveOnce(
    fertilizers,
    solveGroups,
    fullTarget,
    netTarget,
    water,
    options,
    new Set(),
    hydroodo,
  );

  if (!best) {
    return {
      best: {
        doses: [],
        achievedPpm: {},
        deviations: [],
        matchScore: 0,
        weightedError: 1,
        warnings: ['no_fertilizers'],
      },
      alternatives: [],
      netTarget: netTarget as TargetPpm,
      solverVersion: SOLVER_VERSION,
    };
  }

  if (hydroodo) {
    best.weightedError = weightedMacroDeviation(fullTarget, best.achievedPpm);
    if (options?.minMatchPct != null && best.matchScore * 100 < options.minMatchPct) {
      best.warnings.push('below_min_match_threshold');
    }
    const microDeficit = solveGroups.some((g) => {
      const t = fullTarget[g] ?? 0;
      if (t <= 0 || ['N', 'P', 'K', 'Ca', 'Mg', 'S'].includes(g)) return false;
      const a = (best.achievedPpm as Record<string, number>)[g] ?? 0;
      return a < t * 0.5;
    });
    if (microDeficit) best.warnings.push('micro_elements_under_target');
  }

  const alternatives: SolveSolution[] = [];
  const seen = new Set<string>([solutionKey(best)]);

  const ranked = [...best.doses].sort((a, b) => b.amountPerL - a.amountPerL);
  for (const dose of ranked) {
    if (alternatives.length >= maxAlt - 1) break;
    const alt = solveOnce(
      fertilizers,
      solveGroups,
      fullTarget,
      netTarget,
      water,
      options,
      new Set([dose.fertilizerId]),
      hydroodo,
    );
    if (!alt) continue;
    const key = solutionKey(alt);
    if (seen.has(key)) continue;
    seen.add(key);
    alt.warnings.push('alternative_exclude_dominant_fertilizer');
    alternatives.push(alt);
  }

  return {
    best,
    alternatives,
    netTarget: netTarget as TargetPpm,
    solverVersion: SOLVER_VERSION,
  };
}
