import {
  fertilizerMacroContributionVector,
  fertilizerRoleEquivalenceKey,
} from './fertilizer-equivalence';
import { isNegligibleWandDoseLineVsTarget } from './wand-alternative-dedupe';
import type { ChemistryModel } from './chemistry-matrix';
import type { FertilizerSpec, SolveSolution } from './types';

export const WAND_SWAP_ROLES = ['Ca', 'K', 'P', 'Mg'] as const;
export type WandSwapRole = (typeof WAND_SWAP_ROLES)[number];

export type RoleMainSource = { productId: string; equivalenceKey: string };

/** Dominant product per Ca/K/P/Mg role (by ppm supplied), ignoring negligible add-on lines. */
export function solutionRoleMainSources(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): Partial<Record<WandSwapRole, RoleMainSource>> {
  const byId = new Map(fertilizers.map((f) => [f.id, f]));
  const byRole = new Map<WandSwapRole, Map<string, number>>();

  for (const role of WAND_SWAP_ROLES) {
    byRole.set(role, new Map());
  }

  for (const d of sol.doses) {
    if (d.amountPerL < minDoseGPerL) continue;
    const f = byId.get(d.fertilizerId);
    if (!f) continue;
    if (isNegligibleWandDoseLineVsTarget(d, f, macroTargets, model)) continue;
    const vec = fertilizerMacroContributionVector(f, model);
    for (const role of WAND_SWAP_ROLES) {
      const contrib = (vec[role] ?? 0) * d.amountPerL;
      if (contrib <= 0) continue;
      const bucket = byRole.get(role)!;
      bucket.set(d.fertilizerId, (bucket.get(d.fertilizerId) ?? 0) + contrib);
    }
  }

  const out: Partial<Record<WandSwapRole, RoleMainSource>> = {};
  for (const role of WAND_SWAP_ROLES) {
    const bucket = byRole.get(role)!;
    let bestId = '';
    let bestPpm = 0;
    for (const [productId, ppm] of bucket) {
      if (ppm > bestPpm) {
        bestPpm = ppm;
        bestId = productId;
      }
    }
    if (bestId) {
      const f = byId.get(bestId)!;
      out[role] = {
        productId: bestId,
        equivalenceKey: fertilizerRoleEquivalenceKey(f, model),
      };
    }
  }
  return out;
}

/** At least one Ca/K/P/Mg main source differs (after role-equivalence merge). */
export function wandRoleMainSourcesDiffer(
  a: SolveSolution,
  b: SolveSolution,
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const sa = solutionRoleMainSources(a, fertilizers, macroTargets, model, minDoseGPerL);
  const sb = solutionRoleMainSources(b, fertilizers, macroTargets, model, minDoseGPerL);
  for (const role of WAND_SWAP_ROLES) {
    const ka = sa[role]?.equivalenceKey ?? '';
    const kb = sb[role]?.equivalenceKey ?? '';
    if (ka !== kb) return true;
  }
  return false;
}

export function findFloraDuoPairInSelection(
  selected: FertilizerSpec[],
): { grow: FertilizerSpec; bloom: FertilizerSpec } | null {
  const duo = selected.filter((f) => /floraduo/i.test(f.name));
  const grow = duo.find((f) => /\bfloraduo a\b/i.test(f.name) && !/bloom/i.test(f.name));
  const bloom = duo.find((f) => /\bfloraduo b\b/i.test(f.name) && !/bloom/i.test(f.name));
  if (grow && bloom) return { grow, bloom };
  return null;
}

/** FloraDuo A+B plus solid correction salts from the same selection. */
export function floraDuoPlusCorrectionSubset(selected: FertilizerSpec[]): FertilizerSpec[] | null {
  const pair = findFloraDuoPairInSelection(selected);
  if (!pair) return null;
  const duoIds = new Set([pair.grow.id, pair.bloom.id]);
  const corrections = selected.filter((f) => !duoIds.has(f.id) && !/floraduo/i.test(f.name));
  return [pair.grow, pair.bloom, ...corrections];
}
