import { achievedForObjective } from './nitrogen-target';
import type { SolverObjectiveConfig } from './types';

export const MACRO_GROUPS = ['N', 'N_NO3', 'N_NH4', 'N_UREA', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

/**
 * ppm an untargeted element may reach for free; also the scale of its penalty above that
 * (documented in MATCH_METRIC.md). Micros sit at the upper end of the usual working range, so the
 * co-elements of a micro mix dosed for Fe (B/Mn/Zn/Cu/Mo) do not hold Fe below target.
 */
export const UNSOLICITED_REFERENCE_PPM: Record<string, number> = {
  N: 80,
  P: 40,
  K: 150,
  Ca: 80,
  Mg: 30,
  S: 50,
  B: 0.5,
  Fe: 2,
  Mn: 1,
  Zn: 0.5,
  Cu: 0.1,
  Mo: 0.05,
  Co: 0.02,
  Na: 10,
  Cl: 10,
  default: 0.05,
};

export const DEFAULT_ELEMENT_PRIORITY: Record<string, number> = {
  N: 3,
  N_NO3: 3,
  N_NH4: 3,
  N_UREA: 2,
  P: 3,
  K: 3,
  Ca: 2,
  Mg: 2,
  S: 2,
  B: 1,
  Fe: 1,
  Mn: 1,
  Zn: 1,
  Cu: 1,
  Mo: 1,
  Co: 1,
  Na: 0.5,
  Cl: 0.5,
};

export const DEFAULT_SOLVER_OBJECTIVE: SolverObjectiveConfig = {
  elementPriorityWeight: DEFAULT_ELEMENT_PRIORITY,
  macroPriority: 3,
  microPriority: 1,
  microOverdoseFactor: 2,
  microUnderdoseFactor: 1,
  macroOverdoseFactor: 1.25,
  macroUnderdoseFactor: 1,
  unsolicitedElementWeight: 0.75,
  unsolicitedFreeFraction: 1,
  microSoftCapPenalty: 1,
};

/** Fraction of `UNSOLICITED_REFERENCE_PPM` an untargeted element may reach without penalty. */
export const UNSOLICITED_FREE_FRACTION = 1;

/**
 * Soft micro cap weight. Micro targets are tiny (Cu 0.02 ppm), so a steep relative penalty above
 * the ceiling made the solver give up 20% of P and K to avoid 0.01 ppm of incidental Cu from an
 * NPK salt (golden case08). Above the ceiling the overdose curvature grows by half and a warning is raised.
 */
export const MICRO_SOFT_CAP_PENALTY = 1;

/**
 * Total solution ppm from cannabis trials with a modified Hoagland micro supply (1× = Fe 4.02,
 * Mn 0.99, Zn 0.20, Cu 0.19, B 0.49 mg/L). At 2× there was no leaf burn; biomass was not
 * consistently lower (Sweetened at substrate pH 4.8 was). At 4× some plants showed lower-leaf burn
 * (Sweetened only at pH 3.8; Auto CBG without silicon) and Sweetened lost biomass at every tested
 * pH, including 6.5 (HortScience 58 (2023) doi:10.21273/HORTSCI17162-23; Agrosystems, Geosciences
 * & Environment 8 (2025) doi:10.1002/agg2.70044). All micros were raised together, so these are
 * tested mixture levels, not per-element toxicity thresholds. No data for Mo.
 */
export const MICRO_TESTED_SAFE_PPM: Record<string, number> = {
  Fe: 8.04,
  Mn: 1.98,
  Zn: 0.4,
  Cu: 0.38,
  B: 0.98,
};

export const MICRO_HARM_PPM: Record<string, number> = {
  Fe: 16.08,
  Mn: 3.96,
  Zn: 0.8,
  Cu: 0.76,
  B: 1.96,
};

/** Default overdose % when a targeted group has no explicit cap (matches `checkHardConstraints`). */
export const DEFAULT_OVERDOSE_PCT = 50;

export type MicroOverdoseCapMode = 'soft' | 'hard';

export function isMacroGroup(group: string): boolean {
  return (MACRO_GROUPS as readonly string[]).includes(group);
}

const isMacro = isMacroGroup;

/** Overdose ceiling is a hard constraint for this group (macros always; micros only in `hard` mode). */
export function isHardCapGroup(group: string, microCap: MicroOverdoseCapMode = 'soft'): boolean {
  return microCap === 'hard' || isMacroGroup(group);
}

export function overdoseCeilingPpm(
  group: string,
  target: number,
  overdosePct: Record<string, number> | undefined,
): number {
  return target * (1 + (overdosePct?.[group] ?? DEFAULT_OVERDOSE_PCT) / 100);
}

/**
 * Soft micro ceiling on the optimised contribution: the larger of `target × (1 + overdose%)` and
 * the tested-safe level minus `backgroundPpm` (source water, fixed A+B doses).
 */
export function microSoftCeilingPpm(
  group: string,
  target: number,
  overdosePct: Record<string, number> | undefined,
  backgroundPpm = 0,
): number {
  const pct = overdoseCeilingPpm(group, target, overdosePct);
  const safe = MICRO_TESTED_SAFE_PPM[group];
  return safe == null ? pct : Math.max(pct, safe - backgroundPpm);
}

/**
 * Hard micro ceiling on the optimised contribution, in every cap mode and for untargeted elements
 * too. Never below the element's own target: an explicit higher target is the grower's call.
 */
export function microHarmCeilingPpm(
  group: string,
  target: number,
  backgroundPpm = 0,
): number | undefined {
  const harm = MICRO_HARM_PPM[group];
  if (harm == null) return undefined;
  return Math.max(0, harm - backgroundPpm, target);
}

function resolvePriority(group: string, config: SolverObjectiveConfig): number {
  const custom = config.elementPriorityWeight?.[group];
  if (custom != null) return custom;
  return isMacro(group) ? (config.macroPriority ?? 3) : (config.microPriority ?? 1);
}

function asymFactor(group: string, rel: number, config: SolverObjectiveConfig): number {
  const over = rel > 0;
  if (isMacro(group)) {
    return over ? (config.macroOverdoseFactor ?? 1.25) : (config.macroUnderdoseFactor ?? 1);
  }
  return over ? (config.microOverdoseFactor ?? 2) : (config.microUnderdoseFactor ?? 1);
}

function refPpm(group: string, config: SolverObjectiveConfig): number {
  return (
    config.unsolicitedReferencePpm?.[group] ??
    UNSOLICITED_REFERENCE_PPM[group] ??
    UNSOLICITED_REFERENCE_PPM.default
  );
}

/**
 * Normaliser: sum of priority weights over targeted groups only. Unsolicited elements must not
 * enter it, otherwise adding a stray element grows the denominator and lowers the score.
 */
export function objectiveNormalizer(
  target: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): number {
  let w = 0;
  for (const [g, t] of Object.entries(target)) {
    if ((t ?? 0) > 0) w += resolvePriority(g, config);
  }
  return w > 0 ? w : 1;
}

export interface ObjectiveRowWeights {
  /** Priority weight `w_g` for a targeted group. */
  priority: number;
  overFactor: number;
  underFactor: number;
  unsolicitedWeight: number;
  unsolicitedReferencePpm: number;
  /** ppm of an untargeted element tolerated without penalty. */
  unsolicitedFreePpm: number;
}

function unsolicitedFreePpm(group: string, config: SolverObjectiveConfig): number {
  return Math.max(0, config.unsolicitedFreeFraction ?? UNSOLICITED_FREE_FRACTION) * refPpm(group, config);
}

export function microSoftCapPenaltyWeight(config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE): number {
  return config.microSoftCapPenalty ?? MICRO_SOFT_CAP_PENALTY;
}

export function objectiveRowWeights(
  group: string,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): ObjectiveRowWeights {
  return {
    priority: resolvePriority(group, config),
    overFactor: asymFactor(group, 1, config),
    underFactor: asymFactor(group, -1, config),
    unsolicitedWeight: config.unsolicitedElementWeight ?? 0.75,
    unsolicitedReferencePpm: refPpm(group, config),
    unsolicitedFreePpm: unsolicitedFreePpm(group, config),
  };
}

export function computeObjective(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): number {
  const achievedAdj = achievedForObjective(target, achieved);
  let sum = 0;
  const all = new Set([...groups, ...Object.keys(achievedAdj), ...Object.keys(target)]);

  for (const g of all) {
    const T = target[g] ?? 0;
    const A = achievedAdj[g] ?? 0;
    if (T > 0) {
      const rel = (A - T) / T;
      const pw = resolvePriority(g, config);
      sum += pw * asymFactor(g, rel, config) * rel * rel;
    } else {
      const excess = A - unsolicitedFreePpm(g, config);
      if (excess > 1e-12) {
        const rel = excess / refPpm(g, config);
        sum += (config.unsolicitedElementWeight ?? 0.75) * rel * rel;
      }
    }
  }

  return sum / objectiveNormalizer(target, config);
}

/** Soft-cap term for micro groups above `microSoftCeilingPpm`; zero in `hard` mode. */
export function microCapPenalty(
  target: Record<string, number>,
  achieved: Record<string, number>,
  overdosePct: Record<string, number> | undefined,
  microCap: MicroOverdoseCapMode = 'soft',
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
  backgroundPpm: Record<string, number> = {},
): number {
  if (microCap === 'hard') return 0;
  let sum = 0;
  for (const [g, T] of Object.entries(target)) {
    if ((T ?? 0) <= 0 || isMacroGroup(g)) continue;
    const over =
      (achieved[g] ?? 0) - microSoftCeilingPpm(g, T, overdosePct, backgroundPpm[g] ?? 0);
    if (over <= 0) continue;
    const rel = over / T;
    sum += microSoftCapPenaltyWeight(config) * resolvePriority(g, config) * rel * rel;
  }
  return sum / objectiveNormalizer(target, config);
}

/** Objective minimised by the forward solver: weighted deviations plus soft micro caps. */
export function computeSolverObjective(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
  overdosePct?: Record<string, number>,
  microCap: MicroOverdoseCapMode = 'soft',
  backgroundPpm: Record<string, number> = {},
): number {
  return (
    computeObjective(groups, target, achieved, config) +
    microCapPenalty(target, achieved, overdosePct, microCap, config, backgroundPpm)
  );
}

/** Micro groups whose achieved ppm exceeds the soft overdose ceiling. */
export function microGroupsOverCap(
  target: Record<string, number>,
  achieved: Record<string, number>,
  overdosePct: Record<string, number> | undefined,
  backgroundPpm: Record<string, number> = {},
): string[] {
  const out: string[] = [];
  for (const [g, T] of Object.entries(target)) {
    if ((T ?? 0) <= 0 || isMacroGroup(g)) continue;
    const ceiling = microSoftCeilingPpm(g, T, overdosePct, backgroundPpm[g] ?? 0);
    if ((achieved[g] ?? 0) > ceiling + 1e-6) out.push(g);
  }
  return out.sort();
}

/** ∂objective/∂achieved_g (asym treated piecewise-constant; C¹ at rel = 0). */
export function objectiveGradient(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): Record<string, number> {
  const achievedAdj = achievedForObjective(target, achieved);
  const grad: Record<string, number> = {};
  const all = new Set([...groups, ...Object.keys(achievedAdj), ...Object.keys(target)]);
  const weightSum = objectiveNormalizer(target, config);

  for (const g of all) {
    const T = target[g] ?? 0;
    const A = achievedAdj[g] ?? 0;
    if (T > 0) {
      const rel = (A - T) / T;
      const pw = resolvePriority(g, config);
      const asym = asymFactor(g, rel, config);
      grad[g] = (pw * 2 * asym * rel) / (T * weightSum);
    } else {
      const excess = A - unsolicitedFreePpm(g, config);
      if (excess > 1e-12) {
        const ref = refPpm(g, config);
        const uw = config.unsolicitedElementWeight ?? 0.75;
        grad[g] = (uw * 2 * (excess / ref)) / (ref * weightSum);
      }
    }
  }
  return grad;
}
