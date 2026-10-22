import { buildChemistryMatrix, type ChemistryModel } from './chemistry-matrix';
import { computeDeviations } from './deviations';
import { growlogMacroMatchPct, weightedMacroDeviation } from './match-metric';
import { computeObjective, DEFAULT_SOLVER_OBJECTIVE } from './objective';
import { multiplyMatrixVector, stableSortFertilizers } from './matrix';
import { solveCapAware } from './solve-optimize';
import type {
  Dose,
  ElementKey,
  FertilizerSpec,
  SolveForwardInput,
  SolveForwardResult,
  SolveSolution,
  TargetPpm,
} from './types';
import { defaultEcEstimator, estimateEcMsCm } from './ec-lmcv2';
import { prepareTargetWithSourceWater } from './source-water';
import { applyAbTankHints, scaleToStockDoses } from './tanks-ab';
import { SOLVER_VERSION } from './types';

const DOSE_STEP = 0.001;

function roundDose(value: number): number {
  return Number((Math.round(value / DOSE_STEP) * DOSE_STEP).toFixed(3));
}

function resolveModel(
  fertilizers: FertilizerSpec[],
  options?: SolveForwardInput['options'],
): ChemistryModel {
  if (options?.model) return options.model;
  return 'canonical';
}

function buildSolution(
  fertilizers: FertilizerSpec[],
  groups: string[],
  x: number[],
  fullTarget: Record<string, number>,
  water: Record<string, number> | undefined,
  model: ChemistryModel,
  options: SolveForwardInput['options'],
  warnings: string[],
): SolveSolution {
  const A = buildChemistryMatrix(fertilizers, groups, model);
  const achievedVec = multiplyMatrixVector(A, x);
  const achievedPpm: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const w = water?.[groups[i]] ?? 0;
    const v = achievedVec[i] + w;
    if (v !== 0) achievedPpm[groups[i]] = v;
  }

  const config = options?.objective ?? DEFAULT_SOLVER_OBJECTIVE;
  const obj = computeObjective(groups, fullTarget, achievedPpm, config);
  const deviations =
    model === 'canonical'
      ? computeDeviations(
          groups as ElementKey[],
          fullTarget as TargetPpm,
          achievedPpm as TargetPpm,
          options?.tolerances,
        )
      : [];

  const volumeL = options?.volumeL;
  const doses: Dose[] = [];
  for (let j = 0; j < fertilizers.length; j++) {
    if (x[j] <= 1e-8) continue;
    const fert = fertilizers[j];
    const amountPerL = roundDose(x[j]);
    doses.push({
      fertilizerId: fert.id,
      fertilizerName: fert.name,
      amountPerL,
      unit: fert.doseUnit,
      tank: fert.tank ?? 'single',
      amountTotal: volumeL != null ? roundDose(amountPerL * volumeL) : undefined,
    });
  }

  const ecEstimateMsCm = estimateEcMsCm(achievedPpm, {
    legacyNAsNitrate: model === 'hydroodo_legacy',
  });

  return {
    doses,
    achievedPpm,
    deviations,
    matchScore: growlogMacroMatchPct(fullTarget, achievedPpm) / 100,
    weightedError: Math.sqrt(obj),
    ecEstimateMsCm,
    warnings: [...warnings],
  };
}

function solutionKey(sol: SolveSolution): string {
  return sol.doses
    .map((d) => `${d.fertilizerId}:${d.amountPerL}`)
    .sort()
    .join('|');
}

function solveOnce(
  fertilizers: FertilizerSpec[],
  netTarget: Record<string, number>,
  fullTarget: Record<string, number>,
  water: Record<string, number> | undefined,
  model: ChemistryModel,
  options: SolveForwardInput['options'],
  excludeIds: Set<string>,
): SolveSolution | null {
  const active = fertilizers.filter((f) => !excludeIds.has(f.id));
  if (active.length === 0) return null;
  const { x, groups, warnings } = solveCapAware(active, netTarget, model, options);
  return buildSolution(active, groups, x, fullTarget, water, model, options, warnings);
}

function resolveSolverOptions(
  options: SolveForwardInput['options'],
): SolveForwardInput['options'] {
  if (!options?.maxEcMsCm) return options;
  if (options.ecEstimateMsCm) return options;
  return { ...options, ecEstimateMsCm: defaultEcEstimator };
}

export function solveForward(input: SolveForwardInput): SolveForwardResult {
  const prepWarnings: string[] = [];
  const mergedWater: import('./source-water').SourceWaterProfile = {
    ppm: {
      ...(input.sourceWater?.ppm ?? {}),
      ...(input.water as Record<string, number> | undefined),
    },
    alkalinityHco3Ppm: input.sourceWater?.alkalinityHco3Ppm,
    alkalinityAsCaco3Equivalent: input.sourceWater?.alkalinityAsCaco3Equivalent,
  };
  const prepared = prepareTargetWithSourceWater(input.target, mergedWater, {
    neutralizeAlkalinityWith: input.options?.neutralizeAlkalinityWith,
    residualHco3MmolPerL: input.options?.residualHco3MmolPerL,
    acidProduct: input.options?.acidProduct,
  });
  prepWarnings.push(...prepared.warnings);

  let fertilizers = stableSortFertilizers(input.fertilizers);
  if (input.options?.tankMode === 'ab') {
    fertilizers = applyAbTankHints(fertilizers, {
      twoTankMode: true,
      neutralSaltsTank: input.options.stockTank?.neutralSaltsTank,
    });
  }

  const model = resolveModel(fertilizers, input.options);
  const fullTarget = input.target as Record<string, number>;
  const water = prepared.effectiveWaterPpm as Record<string, number>;
  const netTarget = prepared.netTarget as Record<string, number>;

  const options = resolveSolverOptions(input.options);
  const maxAlt = Math.max(1, Math.min(options?.maxAlternatives ?? 3, 5));

  const best = solveOnce(fertilizers, netTarget, fullTarget, water, model, options, new Set());
  if (best) {
    best.warnings.unshift(...prepWarnings);
    if (options?.stockTank) {
      best.stockTanks = scaleToStockDoses(best.doses, fertilizers, {
        ...options.stockTank,
        twoTankMode: options.stockTank.twoTankMode ?? options.tankMode === 'ab',
      });
      best.warnings.push(...best.stockTanks.warnings);
      best.doses = [
        ...best.stockTanks.tankA,
        ...best.stockTanks.tankB,
        ...best.stockTanks.single,
      ];
    }
  }

  if (!best) {
    return {
      best: {
        doses: [],
        achievedPpm: {},
        deviations: [],
        matchScore: 0,
        weightedError: 1,
        warnings: ['no_fertilizers', ...prepWarnings],
      },
      alternatives: [],
      netTarget: netTarget as TargetPpm,
      solverVersion: SOLVER_VERSION,
    };
  }

  best.weightedError = weightedMacroDeviation(fullTarget, best.achievedPpm);

  const alternatives: SolveSolution[] = [];
  const seen = new Set<string>([solutionKey(best)]);

  const ranked = [...best.doses].sort((a, b) => b.amountPerL - a.amountPerL);
  for (const dose of ranked) {
    if (alternatives.length >= maxAlt - 1) break;
    const alt = solveOnce(
      fertilizers,
      netTarget,
      fullTarget,
      water,
      model,
      options,
      new Set([dose.fertilizerId]),
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
