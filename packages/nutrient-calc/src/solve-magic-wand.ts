import { buildChemistryMatrix, collectGroups, type ChemistryModel } from './chemistry-matrix';
import {
  fertilizerMacroContributionVector,
  fertilizerRoleEquivalenceKey,
  solutionHasDuplicateRoleEquivalents,
  subsetHasDuplicateRoleEquivalents,
} from './fertilizer-equivalence';
import {
  areMagicWandSolutionsEquivalent,
  isStrictSupersetCollapsedSaltSet,
  isTraceWandDoseLineVsTarget,
  wandMacroTargetsFromNet,
} from './wand-alternative-dedupe';
import {
  detectManufacturerAbPairs,
  manufacturerAbPairCorrectionSubsets,
  shouldLinkManufacturerAbPairs,
  solutionSatisfiesAbPairs,
} from './manufacturer-ab-pairs';
import {
  anchoredManufacturerAbPartADoseGPerL,
  WAND_AB_PAIR_MIN_LABEL_FRACTION,
} from './wand-manufacturer-ab-solve';
import {
  solutionRoleMainSources,
  WAND_SWAP_ROLES,
  wandRoleMainSourcesDiffer,
} from './wand-role-sources';
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
/** Best plus up to four distinct alternatives (five tabs total). */
export const MAX_WAND_TOTAL_OPTIONS = 5;
const MAX_WAND_ALTERNATIVE_COUNT = MAX_WAND_TOTAL_OPTIONS - 1;
const MAX_WAND_ROLE_RE_SOLVES = 4;
const MAX_TRACE_STRIP_PASSES = 6;

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

function isRedundantWandAlternative(
  candidate: SolveSolution,
  kept: SolveSolution[],
  fertilizers: FertilizerSpec[],
  macroTargets: Record<string, number>,
  model: ChemistryModel,
): boolean {
  for (const k of kept) {
    if (
      areMagicWandSolutionsEquivalent(
        k,
        candidate,
        fertilizers,
        macroTargets,
        model,
        MIN_DOSE_G_PER_L,
      )
    ) {
      return true;
    }
    if (
      !wandRoleMainSourcesDiffer(
        k,
        candidate,
        fertilizers,
        macroTargets,
        model,
        MIN_DOSE_G_PER_L,
      )
    ) {
      return true;
    }
    if (
      isStrictSupersetCollapsedSaltSet(
        k,
        candidate,
        fertilizers,
        macroTargets,
        model,
        MIN_DOSE_G_PER_L,
      )
    ) {
      return true;
    }
  }
  return false;
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

export interface SolveMagicWandInput extends SolveForwardInput {
  substitutePool?: FertilizerSpec[];
  maxVariants?: number;
}

function displayedMatchPct(
  sol: SolveSolution,
  netTarget: Record<string, number>,
  model: ChemistryModel,
): number {
  return macroMatchScorePct(netTarget, sol.achievedPpm as Record<string, number>, model);
}

function solveForwardWithTraceStrip(
  input: SolveMagicWandInput,
  subset: FertilizerSpec[],
  options: SolveForwardInput['options'],
  required: string[],
  netTarget: Record<string, number>,
  model: ChemistryModel,
  preserveFertilizerIds?: Set<string>,
): SolveForwardResult {
  const macroTargets = wandMacroTargetsFromNet(netTarget, model);
  let current = stableSortFertilizers(subset);
  let result = solveForward({ ...input, fertilizers: current, options });
  for (let pass = 0; pass < MAX_TRACE_STRIP_PASSES; pass++) {
    const sol = result.best;
    const byId = new Map(current.map((f) => [f.id, f]));
    const dropIds = new Set<string>();
    for (const d of sol.doses) {
      if (d.amountPerL < MIN_DOSE_G_PER_L) continue;
      if (preserveFertilizerIds?.has(d.fertilizerId)) continue;
      const f = byId.get(d.fertilizerId);
      if (!f) continue;
      const macroVec = fertilizerMacroContributionVector(f, model);
      const suppliesMacro = ['N', 'P', 'K', 'Ca', 'Mg', 'S'].some(
        (k) => (macroVec[k] ?? 0) > 0,
      );
      if (
        suppliesMacro &&
        isTraceWandDoseLineVsTarget(d, f, macroTargets, netTarget, model)
      ) {
        dropIds.add(d.fertilizerId);
      }
    }
    if (dropIds.size === 0) break;
    const next = current.filter((f) => !dropIds.has(f.id));
    if (next.length === 0 || next.length === current.length) break;
    if (!subsetCoversRequiredMacros(next, required, model)) break;
    current = next;
    result = solveForward({ ...input, fertilizers: current, options });
  }
  return result;
}

export function solveMagicWand(input: SolveMagicWandInput): SolveForwardResult {
  const maxAltCount = Math.min(
    Math.max(input.options?.maxAlternatives ?? MAX_WAND_ALTERNATIVE_COUNT, 0),
    MAX_WAND_ALTERNATIVE_COUNT,
  );
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

  const dedupeSelectedByEquivalence = (products: FertilizerSpec[]): FertilizerSpec[] =>
    stableSortFertilizers(products).filter((f, _i, arr) => {
      const k = fertilizerRoleEquivalenceKey(f, model);
      const firstIdx = arr.findIndex((x) => fertilizerRoleEquivalenceKey(x, model) === k);
      return arr.indexOf(f) === firstIdx;
    });

  const selected = dedupeSelectedByEquivalence(selectedRaw);
  const baseSolveOptions = { ...input.options, fastSolver: input.options?.fastSolver ?? false };
  const altSolveOptions = { ...input.options, fastSolver: true };
  const base = solveForwardWithTraceStrip(
    input,
    selected,
    baseSolveOptions,
    required,
    netTarget,
    model,
  );
  const candidates: Array<{ sol: SolveSolution; fromAbPair: boolean }> = [];
  const seenCanonical = new Set<string>();
  const enforceAbPairs = shouldLinkManufacturerAbPairs(model, input.options);
  const abSubsetKeys = new Set(
    manufacturerAbPairCorrectionSubsets(selectedRaw).map((subset) =>
      stableSortFertilizers(subset).map((f) => f.id).join(','),
    ),
  );
  const pushIfValid = (
    sol: SolveSolution,
    subset: FertilizerSpec[],
    fromAbPair = false,
  ) => {
    if (
      enforceAbPairs &&
      !solutionSatisfiesAbPairs(sol, detectManufacturerAbPairs(subset), MIN_DOSE_G_PER_L)
    ) {
      return;
    }
    if (!solutionProvidesRequiredMacros(sol, allFerts, required, model)) return;
    if (!subsetCoversRequiredMacros(subset, required, model)) return;
    if (!fromAbPair && subsetHasDuplicateRoleEquivalents(subset, model)) return;
    if (
      !fromAbPair &&
      solutionHasDuplicateRoleEquivalents(sol.doses, allFerts, model, MIN_DOSE_G_PER_L)
    ) {
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
    candidates.push({ sol: annotateScore(sol, netTarget, model), fromAbPair });
  };

  const macroTargetsForRoles = wandMacroTargetsFromNet(netTarget, model);
  const bestRoleSources = solutionRoleMainSources(
    base.best,
    allFerts,
    macroTargetsForRoles,
    model,
    MIN_DOSE_G_PER_L,
  );

  const candidateSubsets: FertilizerSpec[][] = [];
  const subsetKeySeen = new Set<string>();

  const tryAddSubset = (subset: FertilizerSpec[]) => {
    const sorted = dedupeSelectedByEquivalence(stableSortFertilizers(subset));
    const key = sorted.map((f) => f.id).join(',');
    if (subsetKeySeen.has(key)) return;
    if (!subsetCoversRequiredMacros(sorted, required, model)) return;
    if (subsetHasDuplicateRoleEquivalents(sorted, model)) return;
    subsetKeySeen.add(key);
    candidateSubsets.push(sorted);
  };

  let roleSubsetsAdded = 0;
  for (const role of WAND_SWAP_ROLES) {
    if (roleSubsetsAdded >= MAX_WAND_ROLE_RE_SOLVES) break;
    const main = bestRoleSources[role];
    if (!main) continue;
    if (!selectedRaw.some((f) => f.id === main.productId)) continue;
    tryAddSubset(selectedRaw.filter((f) => f.id !== main.productId));
    roleSubsetsAdded += 1;
  }

  const selectedPairs = detectManufacturerAbPairs(selectedRaw);
  const linkedAbIds = new Set(selectedPairs.flatMap((p) => [p.partA.id, p.partB.id]));
  for (const pair of selectedPairs) {
    const corrections = dedupeSelectedByEquivalence(
      selectedRaw.filter((f) => !linkedAbIds.has(f.id)),
    );
    const abSubset = stableSortFertilizers([pair.partA, pair.partB, ...corrections]);
    const preserve = new Set([pair.partA.id, pair.partB.id]);
    const labelRef =
      anchoredManufacturerAbPartADoseGPerL(pair, netTarget, model) /
      WAND_AB_PAIR_MIN_LABEL_FRACTION;
    let abSol: SolveSolution | null = null;
    for (const frac of [0.3, 0.5, 0.75, 1]) {
      const anchor = Math.max(MIN_DOSE_G_PER_L, labelRef * frac);
      const abOptions = {
        ...altSolveOptions,
        fastSolver: false,
        wandAbPairFixPartADoseGPerL: anchor,
      };
      const candidate = solveForwardWithTraceStrip(
        input,
        abSubset,
        abOptions,
        required,
        netTarget,
        model,
        preserve,
      ).best;
      if (
        solutionPassesMacroDeficitGuard(
          netTarget,
          candidate.achievedPpm as Record<string, number>,
          model,
        )
      ) {
        abSol = candidate;
        break;
      }
    }
    if (!abSol) continue;
    abSol.weightedError = weightedMacroDeviation(
      input.target as Record<string, number>,
      abSol.achievedPpm as Record<string, number>,
    );
    pushIfValid(abSol, abSubset, true);
  }

  for (const subset of candidateSubsets) {
    if (candidates.length >= maxAltCount + 6) break;
    const subsetKey = stableSortFertilizers(subset).map((f) => f.id).join(',');
    if (abSubsetKeys.has(subsetKey)) continue;
    const sol = solveForwardWithTraceStrip(
      input,
      subset,
      altSolveOptions,
      required,
      netTarget,
      model,
    ).best;
    sol.weightedError = weightedMacroDeviation(
      input.target as Record<string, number>,
      sol.achievedPpm as Record<string, number>,
    );
    pushIfValid(sol, subset, false);
  }

  const macroTargets = wandMacroTargetsFromNet(netTarget, model);
  const bestAnnotated = annotateScore(base.best, netTarget, model);

  const alternatives: SolveSolution[] = [];
  const keptForDedupe: SolveSolution[] = [bestAnnotated];

  const tryKeepAlternative = (annotated: SolveSolution, fromAbPair: boolean): boolean => {
    if (
      !fromAbPair &&
      !wandRoleMainSourcesDiffer(
        bestAnnotated,
        annotated,
        allFerts,
        macroTargets,
        model,
        MIN_DOSE_G_PER_L,
      )
    ) {
      return false;
    }
    if (isRedundantWandAlternative(annotated, keptForDedupe, allFerts, macroTargets, model)) {
      return false;
    }
    alternatives.push(annotated);
    keptForDedupe.push(annotated);
    return true;
  };

  for (const { sol } of candidates.filter((c) => c.fromAbPair)) {
    if (alternatives.length >= maxAltCount) break;
    tryKeepAlternative(sol, true);
  }
  for (const { sol } of candidates.filter((c) => !c.fromAbPair)) {
    if (alternatives.length >= maxAltCount) break;
    tryKeepAlternative(sol, false);
  }

  const ranked = [bestAnnotated, ...alternatives].sort(
    (a, b) => displayedMatchPct(b, netTarget, model) - displayedMatchPct(a, netTarget, model),
  );

  return {
    ...base,
    best: ranked[0] ?? bestAnnotated,
    alternatives: ranked.slice(1, 1 + maxAltCount),
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
