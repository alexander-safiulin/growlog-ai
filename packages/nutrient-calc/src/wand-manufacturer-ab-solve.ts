import {
  buildChemistryMatrix,
  collectGroups,
  type ChemistryModel,
} from './chemistry-matrix';
import {
  achievedPpmFromDoseRows,
  augmentMatrixWithLinkedPartB,
  type ManufacturerAbPair,
} from './manufacturer-ab-pairs';
import { growlogMacroMatchPct } from './match-metric';
import { stableSortFertilizers } from './matrix';
import { solveCorrectionsForNetTarget } from './solve-forward';
import { wandMacroTargetsFromNet } from './wand-alternative-dedupe';
import type { Dose, FertilizerSpec, SolveForwardInput, SolveForwardOptions, SolveSolution } from './types';

/** CANNA-style equal A/B at 2 ml/L each (20 ml / 10 L). */
const DEFAULT_LABEL_ML_PER_L = 2;

const LABEL_DOSE_METADATA_KEYS = [
  'feed_schedule_ml_per_l',
  'recommended_ml_per_l',
  'label_dose_ml_per_l',
  'application_ml_per_l',
  'grow_ml_per_l',
] as const;

export const WAND_AB_PAIR_MIN_LABEL_FRACTION = 0.3;
export const WAND_AB_DOSE_FRACTIONS = [0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 1] as const;

function labelPartADoseMlPerL(pair: ManufacturerAbPair): number | null {
  const meta = pair.partA.metadata ?? {};
  for (const key of LABEL_DOSE_METADATA_KEYS) {
    const v = meta[key];
    if (typeof v === 'number' && v > 0) return v;
  }
  if (pair.partA.doseUnit === 'ml_per_L' && pair.partB.doseUnit === 'ml_per_L') {
    return DEFAULT_LABEL_ML_PER_L;
  }
  return null;
}

/** Estimate part-A dose (g/L or mL/L) from N and K targets using linked A+B chemistry. */
export function estimateManufacturerAbPartADoseGPerL(
  pair: ManufacturerAbPair,
  netTarget: Record<string, number>,
  model: ChemistryModel,
): number {
  const groups = collectGroups([pair.partA, pair.partB], netTarget, model);
  let A = buildChemistryMatrix([pair.partA], groups, model);
  A = augmentMatrixWithLinkedPartB(A, [pair.partA], [pair], groups, model);
  const macroN = wandMacroTargetsFromNet(netTarget, model).N;
  const hints: number[] = [];
  const pushHint = (group: string, target: number) => {
    if (target <= 0) return;
    const i = groups.indexOf(group);
    if (i < 0) return;
    const coeff = A[i]?.[0] ?? 0;
    if (coeff > 1e-6) hints.push(target / coeff);
  };
  if (model === 'hydroodo_legacy') {
    pushHint('N', macroN);
  } else {
    pushHint('N_NO3', netTarget.N_NO3 ?? 0);
    pushHint('N_NH4', netTarget.N_NH4 ?? 0);
    pushHint('N_UREA', netTarget.N_UREA ?? 0);
    if (macroN > 0 && !(netTarget.N_NO3 || netTarget.N_NH4 || netTarget.N_UREA)) {
      pushHint('N_NO3', macroN);
    }
  }
  pushHint('K', netTarget.K ?? 0);
  if (hints.length === 0) return 0.2;
  return hints.reduce((a, b) => a + b, 0) / hints.length;
}

export function manufacturerAbReferencePartADoseGPerL(
  pair: ManufacturerAbPair,
  netTarget: Record<string, number>,
  model: ChemistryModel,
): number {
  const fromTarget = estimateManufacturerAbPartADoseGPerL(pair, netTarget, model);
  const label = labelPartADoseMlPerL(pair);
  if (label != null) {
    return Math.max(label, Math.min(fromTarget, label * 1.25), 0.05);
  }
  return Math.max(fromTarget, 0.05);
}

export function anchoredManufacturerAbPartADoseGPerL(
  pair: ManufacturerAbPair,
  netTarget: Record<string, number>,
  model: ChemistryModel,
): number {
  const reference = manufacturerAbReferencePartADoseGPerL(pair, netTarget, model);
  return Math.max(0.01, reference * WAND_AB_PAIR_MIN_LABEL_FRACTION);
}

function residualNetTargetAfterAb(
  netTarget: Record<string, number>,
  abContrib: Record<string, number>,
): Record<string, number> {
  const residual: Record<string, number> = { ...netTarget };
  const keys = new Set([...Object.keys(netTarget), ...Object.keys(abContrib)]);
  for (const g of keys) {
    residual[g] = Math.max(0, (netTarget[g] ?? 0) - (abContrib[g] ?? 0));
  }
  return residual;
}

function abDoseRows(
  pair: ManufacturerAbPair,
  partADose: number,
  options?: SolveForwardOptions,
): Dose[] {
  const partBDose = partADose * pair.ratioBPerA;
  const volumeL = options?.volumeL;
  const row = (fert: FertilizerSpec, amountPerL: number): Dose => ({
    fertilizerId: fert.id,
    fertilizerName: fert.name,
    amountPerL,
    unit: fert.doseUnit,
    tank: fert.tank ?? 'single',
    amountTotal: volumeL != null ? amountPerL * volumeL : undefined,
  });
  return [row(pair.partA, partADose), row(pair.partB, partBDose)];
}

export interface ManufacturerAbSolveContext {
  netTarget: Record<string, number>;
  fullTarget: Record<string, number>;
  water?: Record<string, number>;
  model: ChemistryModel;
  options?: SolveForwardOptions;
}

/**
 * Dose A+B at a fixed level, subtract their ppm from the net target, then solve correction salts only.
 */
export function solveManufacturerAbPairAtPartADose(
  corrections: FertilizerSpec[],
  pair: ManufacturerAbPair,
  partADose: number,
  ctx: ManufacturerAbSolveContext,
): SolveSolution | null {
  const abSubset = stableSortFertilizers([pair.partA, pair.partB, ...corrections]);
  const abRows = abDoseRows(pair, partADose, ctx.options);
  const abContrib = achievedPpmFromDoseRows(
    abRows,
    [pair.partA, pair.partB],
    ctx.fullTarget,
    undefined,
    ctx.model,
  );
  const residual = residualNetTargetAfterAb(ctx.netTarget, abContrib);
  const corrSol = solveCorrectionsForNetTarget(
    corrections,
    residual,
    ctx.fullTarget,
    ctx.water,
    ctx.model,
    ctx.options,
  );
  if (!corrSol) return null;

  const mergedDoses = [
    ...abRows,
    ...corrSol.doses.filter(
      (d) => d.fertilizerId !== pair.partA.id && d.fertilizerId !== pair.partB.id,
    ),
  ];
  const achievedPpm = achievedPpmFromDoseRows(
    mergedDoses,
    abSubset,
    ctx.fullTarget,
    ctx.water,
    ctx.model,
  );
  const matchScore = growlogMacroMatchPct(ctx.fullTarget, achievedPpm) / 100;
  return {
    doses: mergedDoses,
    achievedPpm,
    deviations: corrSol.deviations,
    matchScore,
    weightedError: corrSol.weightedError,
    ecEstimateMsCm: corrSol.ecEstimateMsCm,
    warnings: [...corrSol.warnings],
  };
}

export function solveMagicWandAbPairCandidate(
  input: SolveForwardInput,
  subset: FertilizerSpec[],
  pair: ManufacturerAbPair,
  options: SolveForwardOptions | undefined,
  netTarget: Record<string, number>,
  water?: Record<string, number>,
): SolveSolution | null {
  const model = options?.model ?? 'canonical';
  const linkedIds = new Set([pair.partA.id, pair.partB.id]);
  const corrections = subset.filter((f) => !linkedIds.has(f.id));
  const anchor = anchoredManufacturerAbPartADoseGPerL(
    pair,
    netTarget,
    model,
  );
  return solveManufacturerAbPairAtPartADose(corrections, pair, anchor, {
    netTarget,
    fullTarget: input.target as Record<string, number>,
    water,
    model,
    options,
  });
}
