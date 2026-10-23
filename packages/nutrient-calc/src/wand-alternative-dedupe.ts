import {
  fertilizerMacroContributionVector,
  fertilizerRoleEquivalenceKey,
} from './fertilizer-equivalence';
import type { ChemistryModel } from './chemistry-matrix';
import type { FertilizerSpec, SolveSolution } from './types';

const MACRO_KEYS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as const;
/** Drop add-on lines that supply <5% of each touched macro's target ppm. */
export const WAND_NEGLIGIBLE_TARGET_SHARE = 0.05;
export const WAND_DOSE_REL_TOLERANCE = 0.05;

export function wandMacroTargetsFromNet(
  netTarget: Record<string, number>,
  model: ChemistryModel = 'canonical',
): Record<string, number> {
  if (model === 'hydroodo_legacy') {
    return {
      N: (netTarget.N ?? 0) + (netTarget.N_NO3 ?? 0) + (netTarget.N_NH4 ?? 0),
      P: netTarget.P ?? 0,
      K: netTarget.K ?? 0,
      Ca: netTarget.Ca ?? 0,
      Mg: netTarget.Mg ?? 0,
      S: netTarget.S ?? 0,
    };
  }
  return {
    N:
      (netTarget.N_NO3 ?? 0) +
      (netTarget.N_NH4 ?? 0) +
      (netTarget.N_UREA ?? 0) +
      (netTarget.N ?? 0),
    P: netTarget.P ?? 0,
    K: netTarget.K ?? 0,
    Ca: netTarget.Ca ?? 0,
    Mg: netTarget.Mg ?? 0,
    S: netTarget.S ?? 0,
  };
}

/** Dose line contributes <5% of target ppm for every macro it supplies. */
export function isNegligibleWandDoseLineVsTarget(
  dose: { fertilizerId: string; amountPerL: number },
  fert: FertilizerSpec,
  macroTargets: Record<string, number>,
  model: ChemistryModel,
): boolean {
  const vec = fertilizerMacroContributionVector(fert, model);
  const touched = MACRO_KEYS.filter((k) => (vec[k] ?? 0) > 0);
  if (touched.length === 0) return true;
  for (const k of touched) {
    const target = macroTargets[k] ?? 0;
    if (target <= 0) continue;
    const contribPpm = (vec[k] ?? 0) * dose.amountPerL;
    if (contribPpm / target > WAND_NEGLIGIBLE_TARGET_SHARE) return false;
  }
  return true;
}

/** Doses aggregated by role-equivalence, omitting negligible add-ons vs target. */
export function solutionCollapsedDoseVector(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): Map<string, number> {
  const byId = new Map(fertilizers.map((f) => [f.id, f]));
  const vec = new Map<string, number>();
  for (const d of sol.doses) {
    if (d.amountPerL < minDoseGPerL) continue;
    const f = byId.get(d.fertilizerId);
    if (!f) continue;
    if (isNegligibleWandDoseLineVsTarget(d, f, macroTargets, model)) continue;
    const k = fertilizerRoleEquivalenceKey(f, model);
    vec.set(k, (vec.get(k) ?? 0) + d.amountPerL);
  }
  return vec;
}

/** Role-equivalence keys with meaningful dose (negligible add-ons omitted). */
export function solutionCollapsedSaltSet(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): string[] {
  const vec = solutionCollapsedDoseVector(sol, fertilizers, macroTargets, model, minDoseGPerL);
  return [...vec.keys()].sort();
}

export function solutionCollapsedSaltSetFingerprint(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): string {
  return solutionCollapsedSaltSet(sol, fertilizers, macroTargets, model, minDoseGPerL).join(',');
}

function dosesWithinRelativeTolerance(a: number, b: number, rel = WAND_DOSE_REL_TOLERANCE): boolean {
  if (a <= 0 && b <= 0) return true;
  if (a <= 0 || b <= 0) return false;
  const scale = Math.max(a, b);
  return Math.abs(a - b) <= rel * scale;
}

/**
 * True when collapsed salt sets match and every equivalence-bucket dose is within ~5%.
 */
export function areMagicWandSolutionsEquivalent(
  a: SolveSolution,
  b: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const va = solutionCollapsedDoseVector(a, fertilizers, macroTargets, model, minDoseGPerL);
  const vb = solutionCollapsedDoseVector(b, fertilizers, macroTargets, model, minDoseGPerL);
  const keys = new Set([...va.keys(), ...vb.keys()]);
  for (const k of keys) {
    const da = va.get(k) ?? 0;
    const db = vb.get(k) ?? 0;
    if (!dosesWithinRelativeTolerance(da, db)) return false;
  }
  return true;
}

/** Candidate only adds extra collapsed salts on top of the best mix (trace / booster add-ons). */
export function isStrictSupersetCollapsedSaltSet(
  best: SolveSolution,
  candidate: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const bestKeys = solutionCollapsedSaltSet(best, fertilizers, macroTargets, model, minDoseGPerL);
  const candKeys = solutionCollapsedSaltSet(candidate, fertilizers, macroTargets, model, minDoseGPerL);
  const bestSet = new Set(bestKeys);
  const candSet = new Set(candKeys);
  if (candSet.size <= bestSet.size) return false;
  for (const k of bestSet) {
    if (!candSet.has(k)) return false;
  }
  return true;
}

export function collapsedSaltSetsDiffer(
  a: SolveSolution,
  b: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const sa = solutionCollapsedSaltSetFingerprint(a, fertilizers, macroTargets, model, minDoseGPerL);
  const sb = solutionCollapsedSaltSetFingerprint(b, fertilizers, macroTargets, model, minDoseGPerL);
  return sa !== sb;
}
