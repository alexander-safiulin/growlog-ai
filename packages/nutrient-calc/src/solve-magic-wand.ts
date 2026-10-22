import { buildChemistryMatrix, collectGroups, type ChemistryModel } from './chemistry-matrix';
import {
  fertilizerRoleEquivalenceKey,
  solutionHasDuplicateRoleEquivalents,
  subsetHasDuplicateRoleEquivalents,
} from './fertilizer-equivalence';
import { classifyFertilizerRoles } from './tanks-ab';
import { growlogMacroMatchPct, weightedMacroDeviation } from './match-metric';
import { stableSortFertilizers } from './matrix';
import { prepareTargetWithSourceWater } from './source-water';
import { solveForward } from './solve-forward';
import type {
  FertilizerSpec,
  SolveForwardInput,
  SolveForwardResult,
  SolveSolution,
} from './types';

const REQUIRED_MACROS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as const;
const MIN_DOSE_G_PER_L = 0.01;
const MAX_MACRO_DEFICIT_PCT = 25;

function macroGroupsForTarget(net: Record<string, number>, model: ChemistryModel): string[] {
  const groups = new Set<string>();
  for (const [k, v] of Object.entries(net)) {
    if ((v ?? 0) <= 0) continue;
    if (model === 'hydroodo_legacy') {
      if (k.startsWith('N_') || k === 'N') groups.add('N');
      else groups.add(k);
    } else {
      if (k === 'N_NO3' || k === 'N_NH4' || k === 'N_UREA') groups.add('N');
      else if (['P', 'K', 'Ca', 'Mg', 'S'].includes(k)) groups.add(k);
    }
  }
  return [...groups];
}

function legacyMacroTarget(net: Record<string, number>): Record<string, number> {
  return {
    N: (net.N_NO3 ?? 0) + (net.N_NH4 ?? 0) + (net.N_UREA ?? 0) + (net.N ?? 0),
    P: net.P ?? 0,
    K: net.K ?? 0,
    Ca: net.Ca ?? 0,
    Mg: net.Mg ?? 0,
    S: net.S ?? 0,
  };
}

function legacyMacroAchieved(achieved: Record<string, number>): Record<string, number> {
  return {
    N: achieved.N ?? 0,
    P: achieved.P ?? 0,
    K: achieved.K ?? 0,
    Ca: achieved.Ca ?? 0,
    Mg: achieved.Mg ?? 0,
    S: achieved.S ?? 0,
  };
}

export function macroMatchScorePct(
  netTarget: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
): number {
  const target =
    model === 'hydroodo_legacy' ? legacyMacroTarget(netTarget) : netTarget;
  const ach =
    model === 'hydroodo_legacy' ? legacyMacroAchieved(achieved) : achieved;
  return growlogMacroMatchPct(target as Record<string, number>, ach as Record<string, number>);
}

function primaryMacros(fert: FertilizerSpec, model: ChemistryModel): Set<string> {
  const roles = classifyFertilizerRoles(fert);
  const out = new Set<string>();
  if (roles.providesCalcium) out.add('Ca');
  if (roles.providesPhosphate) out.add('P');
  if (roles.providesSulfate) out.add('S');
  const declared = fert.declaredPct ?? {};
  for (const key of Object.keys(declared)) {
    if (key === 'NO3' || key === 'NH4' || key === 'N' || key === 'N_NO3') out.add('N');
    if (key === 'P2O5' || key === 'P') out.add('P');
    if (key === 'K2O' || key === 'K') out.add('K');
    if (key === 'Ca' || key === 'CaO' || key === 'Ca(NO3)2' || key.includes('Ca')) out.add('Ca');
    if (key === 'Mg' || key === 'MgO' || key.includes('Mg')) out.add('Mg');
    if (key === 'S' || key === 'SO4' || key === 'SO3') out.add('S');
    const g = model === 'hydroodo_legacy' ? (key === 'NO3' || key === 'NH4' || key === 'N' ? 'N' : key) : key;
    if (REQUIRED_MACROS.includes(g as (typeof REQUIRED_MACROS)[number])) out.add(g);
  }
  return out;
}

function subsetCoversRequiredMacros(
  subset: FertilizerSpec[],
  required: string[],
  model: ChemistryModel,
): boolean {
  const covered = new Set<string>();
  for (const f of subset) {
    for (const g of primaryMacros(f, model)) covered.add(g);
  }
  return required.every((g) => covered.has(g));
}

function solutionActiveProviders(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
): Map<string, Set<string>> {
  const byMacro = new Map<string, Set<string>>();
  for (const g of REQUIRED_MACROS) byMacro.set(g, new Set());
  for (const d of sol.doses) {
    if (d.amountPerL < MIN_DOSE_G_PER_L) continue;
    const f = fertilizers.find((x) => x.id === d.fertilizerId);
    if (!f) continue;
    for (const g of primaryMacros(f, model)) {
      byMacro.get(g)?.add(d.fertilizerId);
    }
  }
  return byMacro;
}

/** Every target macro must have an active product provider in the mix. */
export function solutionProvidesRequiredMacros(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  required: string[],
  model: ChemistryModel,
): boolean {
  const providers = solutionActiveProviders(sol, fertilizers, model);
  return required.every((g) => (providers.get(g)?.size ?? 0) > 0);
}

const SCORE_NEAR_DUPLICATE_PCT = 1;

/** Stable identity for products with the same declared composition (e.g. two MgSO₄ brands). */
export function fertilizerCompositionSignature(fert: FertilizerSpec): string {
  const declared = fert.declaredPct ?? {};
  return Object.entries(declared)
    .filter(([, v]) => (v ?? 0) > 0.05)
    .map(([k, v]) => `${k}:${Math.round((v ?? 0) * 10)}`)
    .sort()
    .join(',');
}

/** Reject mixes where any required macro is more than `maxDeficitPct` below target. */
export function solutionPassesMacroDeficitGuard(
  netTarget: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
  maxDeficitPct = MAX_MACRO_DEFICIT_PCT,
): boolean {
  const target =
    model === 'hydroodo_legacy' ? legacyMacroTarget(netTarget) : netTarget;
  const ach =
    model === 'hydroodo_legacy' ? legacyMacroAchieved(achieved) : achieved;
  const floor = 1 - maxDeficitPct / 100;
  for (const g of REQUIRED_MACROS) {
    const t = target[g] ?? 0;
    if (t <= 0) continue;
    if ((ach[g] ?? 0) < t * floor - 1e-6) return false;
  }
  return true;
}

function stripSubMinDoses(sol: SolveSolution): SolveSolution {
  return {
    ...sol,
    doses: sol.doses.filter((d) => d.amountPerL >= MIN_DOSE_G_PER_L),
  };
}

function canonicalDoseVector(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
): Map<string, number> {
  const byId = new Map(fertilizers.map((f) => [f.id, f]));
  const vec = new Map<string, number>();
  for (const d of sol.doses) {
    if (d.amountPerL < MIN_DOSE_G_PER_L) continue;
    const f = byId.get(d.fertilizerId);
    const sig = f ? fertilizerRoleEquivalenceKey(f, model) : `id:${d.fertilizerId}`;
    vec.set(sig, (vec.get(sig) ?? 0) + d.amountPerL);
  }
  return vec;
}

/** Dose vector keyed by role-equivalence (ignores product id swaps and <0.01 g/L lines). */
export function solutionCanonicalDoseKey(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
): string {
  const vec = canonicalDoseVector(sol, fertilizers, model);
  return [...vec.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${(Math.round(v * 1000) / 1000).toFixed(3)}`)
    .join('|');
}

function canonicalVectorsNearEqual(
  a: SolveSolution,
  b: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  doseEpsilon = 0.005,
): boolean {
  const va = canonicalDoseVector(a, fertilizers, model);
  const vb = canonicalDoseVector(b, fertilizers, model);
  const keys = new Set([...va.keys(), ...vb.keys()]);
  for (const k of keys) {
    if (Math.abs((va.get(k) ?? 0) - (vb.get(k) ?? 0)) > doseEpsilon) return false;
  }
  return true;
}

function isNearDuplicateAlternative(
  kept: SolveSolution,
  candidate: SolveSolution,
  fertilizers: FertilizerSpec[],
  netTarget: Record<string, number>,
  model: ChemistryModel,
): boolean {
  if (
    solutionCanonicalDoseKey(kept, fertilizers, model) ===
    solutionCanonicalDoseKey(candidate, fertilizers, model)
  ) {
    return true;
  }
  if (!canonicalVectorsNearEqual(kept, candidate, fertilizers, model)) return false;
  const scoreK = macroMatchScorePct(netTarget, kept.achievedPpm as Record<string, number>, model);
  const scoreC = macroMatchScorePct(
    netTarget,
    candidate.achievedPpm as Record<string, number>,
    model,
  );
  return Math.abs(scoreK - scoreC) <= SCORE_NEAR_DUPLICATE_PCT;
}

function annotateScore(
  sol: SolveSolution,
  netTarget: Record<string, number>,
  model: ChemistryModel,
): SolveSolution {
  const achieved = sol.achievedPpm as Record<string, number>;
  const passes = solutionPassesMacroDeficitGuard(netTarget, achieved, model);
  const pct = passes
    ? macroMatchScorePct(netTarget, achieved, model)
    : Math.min(
        macroMatchScorePct(netTarget, achieved, model),
        100 - MAX_MACRO_DEFICIT_PCT - 1,
      );
  return stripSubMinDoses({ ...sol, matchScore: pct / 100 });
}

function soleProviders(
  solution: SolveSolution,
  fertilizers: FertilizerSpec[],
  required: string[],
  model: ChemistryModel,
): Map<string, string> {
  const map = new Map<string, string>();
  const providers = solutionActiveProviders(solution, fertilizers, model);
  for (const g of required) {
    const ids = [...(providers.get(g) ?? [])];
    if (ids.length === 1) map.set(g, ids[0]);
  }
  return map;
}

export interface SolveMagicWandInput extends SolveForwardInput {
  substitutePool?: FertilizerSpec[];
  maxVariants?: number;
}

export function solveMagicWand(input: SolveMagicWandInput): SolveForwardResult {
  const maxVariants = Math.min(Math.max(input.options?.maxAlternatives ?? 5, 2), 12);
  const model = input.options?.model ?? 'canonical';
  const mergedWater = {
    ppm: { ...(input.sourceWater?.ppm ?? {}), ...(input.water as Record<string, number> | undefined) },
    alkalinityHco3Ppm: input.sourceWater?.alkalinityHco3Ppm,
    alkalinityAsCaco3Equivalent: input.sourceWater?.alkalinityAsCaco3Equivalent,
  };
  const prepared = prepareTargetWithSourceWater(input.target, mergedWater, {
    neutralizeAlkalinityWith: input.options?.neutralizeAlkalinityWith,
    acidProduct: input.options?.acidProduct,
  });
  const netTarget = prepared.netTarget as Record<string, number>;
  const required = macroGroupsForTarget(netTarget, model);

  const allFerts = stableSortFertilizers([
    ...input.fertilizers,
    ...(input.substitutePool ?? []),
  ]);
  const selectedRaw = stableSortFertilizers(input.fertilizers);
  const selected = selectedRaw.filter((f, _i, arr) => {
    const k = fertilizerRoleEquivalenceKey(f, model);
    const firstIdx = arr.findIndex((x) => fertilizerRoleEquivalenceKey(x, model) === k);
    return arr.indexOf(f) === firstIdx;
  });
  const base = solveForward({ ...input, fertilizers: selected });
  const pool = stableSortFertilizers([
    ...selected,
    ...(input.substitutePool ?? []).filter((p) => !selected.some((s) => s.id === p.id)),
  ]);

  const candidates: SolveSolution[] = [];
  const seenCanonical = new Set<string>();

  const pushIfValid = (sol: SolveSolution, subset: FertilizerSpec[]) => {
    if (!solutionProvidesRequiredMacros(sol, allFerts, required, model)) return;
    if (!subsetCoversRequiredMacros(subset, required, model)) return;
    if (subsetHasDuplicateRoleEquivalents(subset, model)) return;
    if (solutionHasDuplicateRoleEquivalents(sol.doses, allFerts, model, MIN_DOSE_G_PER_L)) {
      return;
    }
    if (
      !solutionPassesMacroDeficitGuard(
        netTarget,
        sol.achievedPpm as Record<string, number>,
        model,
      )
    ) {
      return;
    }
    const canonKey = solutionCanonicalDoseKey(sol, allFerts, model);
    if (seenCanonical.has(canonKey)) return;
    seenCanonical.add(canonKey);
    candidates.push(annotateScore(sol, netTarget, model));
  };

  pushIfValid(base.best, selected);

  const sole = soleProviders(base.best, allFerts, required, model);
  const activeIds = new Set(
    base.best.doses.filter((d) => d.amountPerL >= MIN_DOSE_G_PER_L).map((d) => d.fertilizerId),
  );

  const candidateSubsets: FertilizerSpec[][] = [];

  for (const dropId of activeIds) {
    const blocked = [...sole.entries()].some(([, id]) => id === dropId);
    if (blocked) continue;
    const subset = selectedRaw.filter((f) => f.id !== dropId);
    if (!subsetCoversRequiredMacros(subset, required, model)) continue;
    if (subsetHasDuplicateRoleEquivalents(subset, model)) continue;
    candidateSubsets.push(subset);
  }

  for (const dropId of activeIds) {
    const substitutes = pool.filter((p) => !selectedRaw.some((s) => s.id === p.id));
    for (const sub of substitutes.slice(0, 12)) {
      const subset = selectedRaw.filter((f) => f.id !== dropId);
      if (!subset.some((f) => f.id === sub.id)) subset.push(sub);
      if (!subsetCoversRequiredMacros(subset, required, model)) continue;
      if (subsetHasDuplicateRoleEquivalents(subset, model)) continue;
      candidateSubsets.push(stableSortFertilizers(subset));
    }
  }

  for (const subset of candidateSubsets) {
    if (candidates.length >= maxVariants + 5) break;
    const res = solveForward({ ...input, fertilizers: subset });
    const subsetIds = new Set(subset.map((f) => f.id));
    const stillBlocked = [...sole.entries()].some(([g, id]) => {
      if (!activeIds.has(id)) return false;
      if (subsetIds.has(id)) return false;
      return !subset.some((f) => primaryMacros(f, model).has(g));
    });
    if (stillBlocked) continue;
    res.best.weightedError = weightedMacroDeviation(
      input.target as Record<string, number>,
      res.best.achievedPpm as Record<string, number>,
    );
    pushIfValid(res.best, subset);
  }

  candidates.sort((a, b) => {
    const scoreA = macroMatchScorePct(netTarget, a.achievedPpm as Record<string, number>, model);
    const scoreB = macroMatchScorePct(netTarget, b.achievedPpm as Record<string, number>, model);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const nA = a.doses.filter((d) => d.amountPerL >= MIN_DOSE_G_PER_L).length;
    const nB = b.doses.filter((d) => d.amountPerL >= MIN_DOSE_G_PER_L).length;
    return nA - nB;
  });

  const best = annotateScore(base.best, netTarget, model);

  const alternatives: SolveSolution[] = [];
  for (const sol of candidates) {
    if (alternatives.length >= maxVariants - 1) break;
    if (isNearDuplicateAlternative(best, sol, allFerts, netTarget, model)) continue;
    if (
      alternatives.some((d) => isNearDuplicateAlternative(d, sol, allFerts, netTarget, model))
    ) {
      continue;
    }
    alternatives.push(annotateScore(sol, netTarget, model));
  }

  return {
    ...base,
    best,
    alternatives,
  };
}

export function elementalFractionTable(
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
): Array<{ fertilizerId: string; name: string; element: string; pctInProduct: number }> {
  const rows: Array<{ fertilizerId: string; name: string; element: string; pctInProduct: number }> =
    [];
  const target: Record<string, number> = { N: 1, P: 1, K: 1, Ca: 1, Mg: 1, S: 1 };
  for (const f of fertilizers) {
    const groups = collectGroups([f], target, model);
    const A = buildChemistryMatrix([f], groups, model);
    for (let i = 0; i < groups.length; i++) {
      const v = A[i]?.[0] ?? 0;
      if (v > 0.01) {
        rows.push({
          fertilizerId: f.id,
          name: f.name,
          element: groups[i],
          pctInProduct: v / 10,
        });
      }
    }
  }
  return rows;
}
