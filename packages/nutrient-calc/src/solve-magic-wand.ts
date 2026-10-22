import { buildChemistryMatrix, collectGroups, type ChemistryModel } from './chemistry-matrix';
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

function primaryMacros(fert: FertilizerSpec, model: ChemistryModel): Set<string> {
  const roles = classifyFertilizerRoles(fert);
  const out = new Set<string>();
  if (roles.providesCalcium) out.add('Ca');
  if (roles.providesPhosphate) out.add('P');
  if (roles.providesSulfate) out.add('S');
  const declared = fert.declaredPct ?? {};
  for (const key of Object.keys(declared)) {
    const g = model === 'hydroodo_legacy' ? (key === 'NO3' || key === 'NH4' || key === 'N' ? 'N' : key) : key;
    if (REQUIRED_MACROS.includes(g as (typeof REQUIRED_MACROS)[number])) out.add(g);
    if (key === 'NO3' || key === 'NH4' || key === 'N' || key === 'N_NO3') out.add('N');
    if (key === 'P2O5' || key === 'P') out.add('P');
    if (key === 'K2O' || key === 'K') out.add('K');
    if (key === 'Ca' || key === 'CaO') out.add('Ca');
    if (key === 'Mg' || key === 'MgO') out.add('Mg');
    if (key === 'S' || key === 'SO4' || key === 'SO3') out.add('S');
  }
  return out;
}

function soleProviders(
  solution: SolveSolution,
  fertilizers: FertilizerSpec[],
  required: string[],
  model: ChemistryModel,
): Map<string, string> {
  const map = new Map<string, string>();
  const active = solution.doses.filter((d) => d.amountPerL > 0);
  for (const g of required) {
    const providers = active.filter((d) => {
      const f = fertilizers.find((x) => x.id === d.fertilizerId);
      return f && primaryMacros(f, model).has(g);
    });
    if (providers.length === 1) map.set(g, providers[0].fertilizerId);
  }
  return map;
}

function solutionKey(sol: SolveSolution): string {
  return sol.doses
    .filter((d) => d.amountPerL > 0)
    .map((d) => `${d.fertilizerId}:${d.amountPerL.toFixed(3)}`)
    .sort()
    .join('|');
}

function subsetCoversRequired(
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

export interface SolveMagicWandInput extends SolveForwardInput {
  /** Optional extra catalog products for substitutions. */
  substitutePool?: FertilizerSpec[];
  maxVariants?: number;
}

/**
 * Ranked alternatives with distinct product subsets. Never drops the only provider of a
 * required macro (N,P,K,Ca,Mg,S) unless a substitute in the subset covers that macro.
 * Ranking: `growlogMacroMatchPct` on net target (single score, higher is better).
 */
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

  const base = solveForward(input);
  const selected = stableSortFertilizers(input.fertilizers);
  const pool = stableSortFertilizers([
    ...selected,
    ...(input.substitutePool ?? []).filter((p) => !selected.some((s) => s.id === p.id)),
  ]);

  const sole = soleProviders(base.best, selected, required, model);
  const seen = new Set<string>([solutionKey(base.best)]);
  const ranked: SolveSolution[] = [base.best];

  const activeIds = new Set(
    base.best.doses.filter((d) => d.amountPerL > 0).map((d) => d.fertilizerId),
  );

  const candidateSubsets: FertilizerSpec[][] = [];

  for (const dropId of activeIds) {
    const blocked = [...sole.entries()].some(([, id]) => id === dropId);
    if (blocked) continue;
    const subset = selected.filter((f) => f.id !== dropId);
    if (!subsetCoversRequired(subset, required, model)) continue;
    candidateSubsets.push(subset);
  }

  for (const dropId of activeIds) {
    const substitutes = pool.filter(
      (p) => !activeIds.has(p.id) && !selected.some((s) => s.id === p.id),
    );
    for (const sub of substitutes.slice(0, 8)) {
      const subset = selected.filter((f) => f.id !== dropId);
      if (!subset.some((f) => f.id === sub.id)) subset.push(sub);
      if (!subsetCoversRequired(subset, required, model)) continue;
      candidateSubsets.push(stableSortFertilizers(subset));
    }
  }

  for (const subset of candidateSubsets) {
    if (ranked.length >= maxVariants) break;
    const res = solveForward({ ...input, fertilizers: subset });
    const key = solutionKey(res.best);
    if (seen.has(key)) continue;
    const subsetIds = new Set(subset.map((f) => f.id));
    const stillBlocked = [...sole.entries()].some(([g, id]) => {
      if (!activeIds.has(id)) return false;
      if (subsetIds.has(id)) return false;
      return !subset.some((f) => primaryMacros(f, model).has(g));
    });
    if (stillBlocked) continue;
    seen.add(key);
    res.best.weightedError = weightedMacroDeviation(
      input.target as Record<string, number>,
      res.best.achievedPpm as Record<string, number>,
    );
    ranked.push(res.best);
  }

  ranked.sort((a, b) => {
    const scoreA = growlogMacroMatchPct(netTarget, a.achievedPpm as Record<string, number>);
    const scoreB = growlogMacroMatchPct(netTarget, b.achievedPpm as Record<string, number>);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const nA = a.doses.filter((d) => d.amountPerL > 0).length;
    const nB = b.doses.filter((d) => d.amountPerL > 0).length;
    return nA - nB;
  });

  const best = ranked[0] ?? base.best;
  const alternatives = ranked.slice(1);

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
