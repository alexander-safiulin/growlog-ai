import { buildChemistryMatrix, collectGroups, type ChemistryModel } from './chemistry-matrix';
import {
  fertilizerMacroContributionVector,
  fertilizerRoleEquivalenceKey,
  isMicroCarrier,
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
  manufacturerAbReferencePartADoseGPerL,
  solveManufacturerAbPairAtPartADose,
  WAND_AB_DOSE_FRACTIONS,
  WAND_AB_PAIR_MIN_LABEL_FRACTION,
} from './wand-manufacturer-ab-solve';
import {
  solutionRoleMainSources,
  WAND_SWAP_ROLES,
  wandRoleMainSourcesDiffer,
} from './wand-role-sources';
import { classifyFertilizerRoles } from './tanks-ab';
import {
  assembleShortfallWarnings,
  solutionMeetsAssembleFloor,
  solutionPassesAssembleOvershoot,
} from './assemble-floor';
import { growlogMacroMatchPct, weightedMacroDeviation } from './match-metric';
import { stableSortFertilizers } from './matrix';
import { computeSolverObjective, DEFAULT_SOLVER_OBJECTIVE } from './objective';
import { prepareTargetWithSourceWater } from './source-water';
import { refreshSolutionFromDoses, solveForward } from './solve-forward';
import type {
  FertilizerSpec,
  SolveForwardInput,
  SolveForwardResult,
  SolveSolution,
} from './types';

const REQUIRED_MACROS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as const;
/** Coverage for a wand subset. Sulfur rides along and must not drop a recipe. */
const COVERAGE_MACROS = ['N', 'P', 'K', 'Ca', 'Mg'] as const;
const MIN_DOSE_G_PER_L = 0.01;
/** Micro mixes are dosed at mg/L scale; a 0.01 g/L floor would force a micro overdose or drop them. */
const MICRO_CARRIER_MIN_DOSE_G_PER_L = 0.001;
/** @deprecated Flat ±25% no longer gates cards. Kept so older imports still resolve. */
export const MAX_MACRO_OVERSHOOT_PCT = 25;
/** Best plus up to four distinct alternatives (five tabs total). */
export const MAX_WAND_TOTAL_OPTIONS = 5;
const MAX_WAND_ALTERNATIVE_COUNT = MAX_WAND_TOTAL_OPTIONS - 1;
const MAX_WAND_ROLE_RE_SOLVES = 4;
/**
 * A product kept only at the display floor must lower the objective by at least this much
 * (≈ a uniform 1.5% deviation on every macro); otherwise the shorter recipe wins (ADR-014 tie-break).
 */
const WAND_EXTRA_PRODUCT_MIN_GAIN = 2.5e-4;
const MAX_TRACE_STRIP_PASSES = 6;

function macroGroupsForTarget(net: Record<string, number>, _model: ChemistryModel): string[] {
  const groups = new Set<string>();
  for (const [k, v] of Object.entries(net)) {
    if ((v ?? 0) <= 0) continue;
    if (k === 'N' || k === 'N_UNKNOWN' || k.startsWith('N_')) groups.add('N');
    else if (['P', 'K', 'Ca', 'Mg', 'S'].includes(k)) groups.add(k);
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
    if (key === 'NO3' || key === 'NH4' || key === 'NH2' || key === 'N' || key === 'N_NO3') out.add('N');
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

export function solutionPassesMacroDeficitGuard(
  netTarget: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
): boolean {
  return solutionMeetsAssembleFloor(netTarget, achieved, model);
}

/** Reject mixes where N, P, K, Ca or Mg exceed that element's overdose ceiling. Sulfur does not hide a card. */
export function solutionPassesMacroOvershootGuard(
  netTarget: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
  overdosePct?: Record<string, number>,
): boolean {
  return solutionPassesAssembleOvershoot(netTarget, achieved, model, overdosePct);
}

export function solutionPassesMacroGuard(
  netTarget: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
  overdosePct?: Record<string, number>,
): boolean {
  return (
    solutionPassesMacroDeficitGuard(netTarget, achieved, model) &&
    solutionPassesMacroOvershootGuard(netTarget, achieved, model, overdosePct)
  );
}

interface WandContext {
  netTarget: Record<string, number>;
  fullTarget: Record<string, number>;
  water: Record<string, number>;
  model: ChemistryModel;
  options: SolveForwardInput['options'];
  fertilizers: FertilizerSpec[];
  microCarrierIds: ReadonlySet<string>;
}

function wandMinDose(fertilizerId: string, ctx: WandContext): number {
  return ctx.microCarrierIds.has(fertilizerId) ? MICRO_CARRIER_MIN_DOSE_G_PER_L : MIN_DOSE_G_PER_L;
}

/** Drop lines below the wand display floor and recompute ppm so the table matches the doses. */
function stripSubMinDoses(sol: SolveSolution, ctx: WandContext): SolveSolution {
  const doses = sol.doses.filter((d) => d.amountPerL >= wandMinDose(d.fertilizerId, ctx) - 1e-9);
  if (doses.length === sol.doses.length) return sol;
  return refreshSolutionFromDoses(
    { ...sol, doses },
    ctx.fertilizers,
    ctx.fullTarget,
    ctx.water,
    ctx.model,
    ctx.options,
  );
}

/** Solver objective on the delivered solution (macros, micros, unsolicited, soft micro caps). */
function wandSolutionObjective(sol: SolveSolution, ctx: WandContext): number {
  if (sol.warnings.includes('infeasible_best_effort')) return Infinity;
  const achieved = sol.achievedPpm as Record<string, number>;
  const groups = [...new Set([...Object.keys(achieved), ...Object.keys(ctx.fullTarget)])];
  return computeSolverObjective(
    groups,
    ctx.fullTarget,
    achieved,
    ctx.options?.objective ?? DEFAULT_SOLVER_OBJECTIVE,
    ctx.options?.overdosePctByGroup,
    ctx.options?.microOverdoseCap ?? 'soft',
  );
}

function solutionCostPerL(sol: SolveSolution, options: SolveForwardInput['options']): number {
  const cost = options?.productCostPerL;
  if (!cost) return 0;
  return sol.doses.reduce((s, d) => s + (cost[d.fertilizerId] ?? 0) * d.amountPerL, 0);
}

/**
 * ADR-014 ranking: displayed macro match % (rounded, as the UI shows it), then fewer products,
 * then lower solver objective, then lower cost.
 */
function compareWandSolutions(a: SolveSolution, b: SolveSolution, ctx: WandContext): number {
  const floorA = solutionMeetsAssembleFloor(
    ctx.fullTarget,
    a.achievedPpm as Record<string, number>,
    ctx.model,
  )
    ? 1
    : 0;
  const floorB = solutionMeetsAssembleFloor(
    ctx.fullTarget,
    b.achievedPpm as Record<string, number>,
    ctx.model,
  )
    ? 1
    : 0;
  if (floorA !== floorB) return floorB - floorA;
  const pa = Math.round(displayedMatchPct(a, ctx.netTarget, ctx.model));
  const pb = Math.round(displayedMatchPct(b, ctx.netTarget, ctx.model));
  if (pa !== pb) return pb - pa;
  if (a.doses.length !== b.doses.length) return a.doses.length - b.doses.length;
  const oa = wandSolutionObjective(a, ctx);
  const ob = wandSolutionObjective(b, ctx);
  if (oa !== ob) return oa - ob;
  return solutionCostPerL(a, ctx.options) - solutionCostPerL(b, ctx.options);
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

function annotateScore(sol: SolveSolution, ctx: WandContext): SolveSolution {
  const consistent = stripSubMinDoses(sol, ctx);
  const achieved = consistent.achievedPpm as Record<string, number>;
  const pct = macroMatchScorePct(ctx.netTarget, achieved, ctx.model);
  return { ...consistent, matchScore: pct / 100 };
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

/**
 * Doses in (0, MIN_DOSE) are not shown by the wand. Resolve each one as a semi-continuous choice:
 * either drop the product or dose it at MIN_DOSE, whichever scores better on the solver objective.
 */
function resolveSubMinDoses(
  input: SolveMagicWandInput,
  start: { fertilizers: FertilizerSpec[]; result: SolveForwardResult },
  options: SolveForwardInput['options'],
  required: string[],
  ctx: WandContext,
): SolveForwardResult {
  let current = start.fertilizers;
  let result = start.result;
  const floors: Record<string, number> = { ...(options?.minDosePerLById ?? {}) };
  const pairs = shouldLinkManufacturerAbPairs(ctx.model, options)
    ? detectManufacturerAbPairs(current)
    : [];
  const pairOf = new Map<string, (typeof pairs)[number]>();
  for (const p of pairs) {
    pairOf.set(p.partA.id, p);
    pairOf.set(p.partB.id, p);
  }
  for (let pass = 0; pass < start.fertilizers.length; pass++) {
    const sub = result.best.doses
      .filter((d) => d.amountPerL > 0 && d.amountPerL < wandMinDose(d.fertilizerId, ctx) - 1e-9)
      .map((d) => {
        const pair = pairOf.get(d.fertilizerId);
        return pair
          ? {
              key: pair.partA.id,
              dropIds: [pair.partA.id, pair.partB.id],
              floor: MIN_DOSE_G_PER_L * Math.max(1, 1 / pair.ratioBPerA),
            }
          : {
              key: d.fertilizerId,
              dropIds: [d.fertilizerId],
              floor: wandMinDose(d.fertilizerId, ctx),
            };
      })
      .filter((u) => floors[u.key] == null)
      .sort((a, b) => a.key.localeCompare(b.key));
    if (sub.length === 0) break;
    const unit = sub[0];

    const floored = solveForward({
      ...input,
      fertilizers: current,
      options: { ...options, minDosePerLById: { ...floors, [unit.key]: unit.floor } },
    });
    const without = current.filter((f) => !unit.dropIds.includes(f.id));
    const excluded =
      without.length > 0 && subsetCoversRequiredMacros(without, required, ctx.model)
        ? solveForward({
            ...input,
            fertilizers: without,
            options: { ...options, minDosePerLById: floors },
          })
        : null;

    if (
      excluded &&
      wandSolutionObjective(excluded.best, ctx) <=
        wandSolutionObjective(floored.best, ctx) + WAND_EXTRA_PRODUCT_MIN_GAIN
    ) {
      current = without;
      result = excluded;
    } else {
      floors[unit.key] = unit.floor;
      result = floored;
    }
  }
  return result;
}

function solveForwardWithTraceStrip(
  input: SolveMagicWandInput,
  subset: FertilizerSpec[],
  options: SolveForwardInput['options'],
  required: string[],
  ctx: WandContext,
): SolveForwardResult {
  const { netTarget, model } = ctx;
  const macroTargets = wandMacroTargetsFromNet(netTarget, model);
  let current = stableSortFertilizers(subset);
  let result = solveForward({ ...input, fertilizers: current, options });
  let objective = wandSolutionObjective(result.best, ctx);

  const tryDrop = (dropIds: ReadonlySet<string>): boolean => {
    const next = current.filter((f) => !dropIds.has(f.id));
    if (next.length === 0 || next.length === current.length) return false;
    if (!subsetCoversRequiredMacros(next, required, model)) return false;
    const nextResult = solveForward({ ...input, fertilizers: next, options });
    const nextObjective = wandSolutionObjective(nextResult.best, ctx);
    if (nextObjective > objective + WAND_EXTRA_PRODUCT_MIN_GAIN) return false;
    current = next;
    result = nextResult;
    objective = nextObjective;
    return true;
  };

  for (let pass = 0; pass < MAX_TRACE_STRIP_PASSES; pass++) {
    const byId = new Map(current.map((f) => [f.id, f]));
    const trace: Array<{ id: string; dose: number }> = [];
    for (const d of result.best.doses) {
      if (d.amountPerL < MIN_DOSE_G_PER_L) continue;
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
        trace.push({ id: d.fertilizerId, dose: d.amountPerL });
      }
    }
    if (trace.length === 0) break;
    if (tryDrop(new Set(trace.map((t) => t.id)))) continue;
    trace.sort((a, b) => a.dose - b.dose || a.id.localeCompare(b.id));
    let dropped = false;
    for (const t of trace) {
      if (tryDrop(new Set([t.id]))) {
        dropped = true;
        break;
      }
    }
    if (!dropped) break;
  }
  return resolveSubMinDoses(input, { fertilizers: current, result }, options, required, ctx);
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
    residualHco3MmolPerL: input.options?.residualHco3MmolPerL,
    acidProduct: input.options?.acidProduct,
  });
  const netTarget = prepared.netTarget as Record<string, number>;
  const overdosePct = input.options?.overdosePctByGroup;
  const required = macroGroupsForTarget(netTarget, model).filter((group) =>
    (COVERAGE_MACROS as readonly string[]).includes(group),
  );

  const allFerts = stableSortFertilizers([
    ...input.fertilizers,
    ...(input.substitutePool ?? []),
  ]);
  const selectedRaw = stableSortFertilizers(input.fertilizers);
  const ctx: WandContext = {
    netTarget,
    fullTarget: input.target as Record<string, number>,
    water: prepared.effectiveWaterPpm as Record<string, number>,
    model,
    options: input.options,
    fertilizers: allFerts,
    microCarrierIds: new Set(allFerts.filter((f) => isMicroCarrier(f, model)).map((f) => f.id)),
  };

  const dedupeSelectedByEquivalence = (products: FertilizerSpec[]): FertilizerSpec[] =>
    stableSortFertilizers(products).filter((f, _i, arr) => {
      const k = fertilizerRoleEquivalenceKey(f, model);
      const firstIdx = arr.findIndex((x) => fertilizerRoleEquivalenceKey(x, model) === k);
      return arr.indexOf(f) === firstIdx;
    });

  const selected = dedupeSelectedByEquivalence(selectedRaw);
  const solveOptions = { ...input.options, maxAlternatives: 1 };
  const base = solveForwardWithTraceStrip(input, selected, solveOptions, required, ctx);
  const candidates: Array<{ sol: SolveSolution; fromAbPair: boolean }> = [];
  const seenCanonical = new Set<string>();
  const enforceAbPairs = shouldLinkManufacturerAbPairs(model, input.options);
  const abSubsetKeys = new Set(
    manufacturerAbPairCorrectionSubsets(selectedRaw).map((subset) =>
      stableSortFertilizers(subset).map((f) => f.id).join(','),
    ),
  );
  const pushIfValid = (
    raw: SolveSolution,
    subset: FertilizerSpec[],
    fromAbPair = false,
  ) => {
    const sol = annotateScore(raw, ctx);
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
      !solutionPassesMacroGuard(
        ctx.fullTarget,
        sol.achievedPpm as Record<string, number>,
        model,
        overdosePct,
      )
    ) {
      return;
    }
    const canonKey = solutionCanonicalDoseKey(sol, allFerts, model);
    if (seenCanonical.has(canonKey)) return;
    seenCanonical.add(canonKey);
    candidates.push({ sol, fromAbPair });
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
    const labelRef = manufacturerAbReferencePartADoseGPerL(pair, netTarget, model);
    const abCtx = {
      netTarget,
      fullTarget: ctx.fullTarget,
      water: ctx.water,
      model,
      options: solveOptions,
    };
    let abSol: SolveSolution | null = null;
    let bestScore = -1;
    const minPartADose = Math.max(
      MIN_DOSE_G_PER_L,
      labelRef * WAND_AB_PAIR_MIN_LABEL_FRACTION,
    );
    for (const frac of WAND_AB_DOSE_FRACTIONS) {
      const partADose = Math.max(MIN_DOSE_G_PER_L, labelRef * frac);
      if (partADose + 1e-9 < minPartADose) continue;
      const candidate = solveManufacturerAbPairAtPartADose(
        corrections,
        pair,
        partADose,
        abCtx,
      );
      if (!candidate) continue;
      const achieved = candidate.achievedPpm as Record<string, number>;
      if (!solutionPassesMacroGuard(ctx.fullTarget, achieved, model, overdosePct)) continue;
      const score = macroMatchScorePct(netTarget, achieved, model);
      if (score > bestScore) {
        bestScore = score;
        abSol = candidate;
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
    const sol = solveForwardWithTraceStrip(input, subset, solveOptions, required, ctx).best;
    sol.weightedError = weightedMacroDeviation(
      input.target as Record<string, number>,
      sol.achievedPpm as Record<string, number>,
    );
    pushIfValid(sol, subset, false);
  }

  const macroTargets = wandMacroTargetsFromNet(netTarget, model);
  const bestAnnotated = annotateScore(base.best, ctx);

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
    if (fromAbPair) {
      for (const k of keptForDedupe) {
        if (
          areMagicWandSolutionsEquivalent(
            k,
            annotated,
            allFerts,
            macroTargets,
            model,
            MIN_DOSE_G_PER_L,
          )
        ) {
          return false;
        }
      }
    } else if (isRedundantWandAlternative(annotated, keptForDedupe, allFerts, macroTargets, model)) {
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

  const ranked = [bestAnnotated, ...alternatives].sort((a, b) =>
    compareWandSolutions(a, b, ctx),
  );
  const meeting = ranked.filter((sol) =>
    solutionMeetsAssembleFloor(ctx.fullTarget, sol.achievedPpm as Record<string, number>, model),
  );
  const shown = (meeting.length > 0 ? meeting : ranked.slice(0, 1)).slice(0, 1 + maxAltCount);
  const noted = shown.map((sol) => {
    const extra = assembleShortfallWarnings(
      ctx.fullTarget,
      sol.achievedPpm as Record<string, number>,
      selected,
      model,
      overdosePct,
    );
    if (extra.length === 0) return sol;
    return {
      ...sol,
      warnings: [...sol.warnings.filter((code) => !code.startsWith('assemble_')), ...extra],
    };
  });

  return {
    ...base,
    best: noted[0] ?? bestAnnotated,
    alternatives: noted.slice(1),
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
      // 0.01 mg/L hid Mo: micro labels are often 0.0003–0.001% (0.003–0.01 mg/L per g/L).
      if (v >= 0.001) {
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
