import {
  fertilizerMacroContributionVector,
  fertilizerRoleEquivalenceKey,
} from './fertilizer-equivalence';
import type { ChemistryModel } from './chemistry-matrix';
import type { FertilizerSpec, SolveSolution } from './types';

const MACRO_KEYS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as const;
export const WAND_NEGLIGIBLE_MACRO_SHARE = 0.02;
export const WAND_DOSE_REL_TOLERANCE = 0.05;

function macroTotalsFromDoses(
  doses: Array<{ fertilizerId: string; amountPerL: number }>,
  byId: Map<string, FertilizerSpec>,
  model: ChemistryModel,
  minDoseGPerL: number,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const d of doses) {
    if (d.amountPerL < minDoseGPerL) continue;
    const f = byId.get(d.fertilizerId);
    if (!f) continue;
    const vec = fertilizerMacroContributionVector(f, model);
    for (const k of MACRO_KEYS) {
      const v = vec[k] ?? 0;
      if (v <= 0) continue;
      totals[k] = (totals[k] ?? 0) + v * d.amountPerL;
    }
  }
  return totals;
}

/** Dose line contributes <2% of solution total for every macro it supplies. */
export function isNegligibleWandDoseLine(
  dose: { fertilizerId: string; amountPerL: number },
  fert: FertilizerSpec,
  macroTotals: Record<string, number>,
  model: ChemistryModel,
): boolean {
  const vec = fertilizerMacroContributionVector(fert, model);
  const touched = MACRO_KEYS.filter((k) => (vec[k] ?? 0) > 0);
  if (touched.length === 0) return true;
  for (const k of touched) {
    const total = macroTotals[k] ?? 0;
    if (total <= 0) continue;
    const share = ((vec[k] ?? 0) * dose.amountPerL) / total;
    if (share >= WAND_NEGLIGIBLE_MACRO_SHARE) return false;
  }
  return true;
}

/** Role-equivalence keys with meaningful dose (negligible trace lines omitted). */
export function solutionCollapsedSaltSet(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): string[] {
  const vec = solutionCollapsedDoseVector(sol, fertilizers, model, minDoseGPerL);
  return [...vec.keys()].sort();
}

export function solutionCollapsedSaltSetFingerprint(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): string {
  return solutionCollapsedSaltSet(sol, fertilizers, model, minDoseGPerL).join(',');
}

/** Doses aggregated by role-equivalence, omitting negligible trace contributors. */
export function solutionCollapsedDoseVector(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): Map<string, number> {
  const byId = new Map(fertilizers.map((f) => [f.id, f]));
  const totals = macroTotalsFromDoses(sol.doses, byId, model, minDoseGPerL);
  const vec = new Map<string, number>();
  for (const d of sol.doses) {
    if (d.amountPerL < minDoseGPerL) continue;
    const f = byId.get(d.fertilizerId);
    if (!f) continue;
    if (isNegligibleWandDoseLine(d, f, totals, model)) continue;
    const k = fertilizerRoleEquivalenceKey(f, model);
    vec.set(k, (vec.get(k) ?? 0) + d.amountPerL);
  }
  return vec;
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
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const va = solutionCollapsedDoseVector(a, fertilizers, model, minDoseGPerL);
  const vb = solutionCollapsedDoseVector(b, fertilizers, model, minDoseGPerL);
  const keys = new Set([...va.keys(), ...vb.keys()]);
  for (const k of keys) {
    const da = va.get(k) ?? 0;
    const db = vb.get(k) ?? 0;
    if (!dosesWithinRelativeTolerance(da, db)) return false;
  }
  return true;
}

export function collapsedSaltSetsDiffer(
  a: SolveSolution,
  b: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const sa = solutionCollapsedSaltSetFingerprint(a, fertilizers, model, minDoseGPerL);
  const sb = solutionCollapsedSaltSetFingerprint(b, fertilizers, model, minDoseGPerL);
  return sa !== sb;
}
