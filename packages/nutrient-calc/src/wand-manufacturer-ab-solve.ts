import {
  buildChemistryMatrix,
  collectGroups,
  type ChemistryModel,
} from './chemistry-matrix';
import { augmentMatrixWithLinkedPartB, type ManufacturerAbPair } from './manufacturer-ab-pairs';
import { wandMacroTargetsFromNet } from './wand-alternative-dedupe';
import type { FertilizerSpec, SolveForwardInput, SolveForwardOptions } from './types';
import { solveForward } from './solve-forward';
import type { SolveSolution } from './types';

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

export function anchoredManufacturerAbPartADoseGPerL(
  pair: ManufacturerAbPair,
  netTarget: Record<string, number>,
  model: ChemistryModel,
): number {
  const fromTarget = estimateManufacturerAbPartADoseGPerL(pair, netTarget, model);
  const label = labelPartADoseMlPerL(pair);
  const reference = Math.max(fromTarget, label ?? 0, 0.05);
  return Math.max(0.01, reference * WAND_AB_PAIR_MIN_LABEL_FRACTION);
}

export function solveMagicWandAbPairCandidate(
  input: SolveForwardInput,
  subset: FertilizerSpec[],
  pair: ManufacturerAbPair,
  options: SolveForwardOptions | undefined,
): SolveSolution {
  const model = options?.model ?? 'canonical';
  const anchor = anchoredManufacturerAbPartADoseGPerL(
    pair,
    input.target as Record<string, number>,
    model,
  );
  const solveOptions: SolveForwardOptions = {
    ...options,
    wandAbPairFixPartADoseGPerL: anchor,
  };
  return solveForward({ ...input, fertilizers: subset, options: solveOptions }).best;
}
