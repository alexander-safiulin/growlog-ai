import type { SolverObjectiveConfig } from './types';

/** Default element priority (macros > micros). */
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
  Si: 0.5,
};

export const DEFAULT_SOLVER_OBJECTIVE: SolverObjectiveConfig = {
  elementPriorityWeight: DEFAULT_ELEMENT_PRIORITY,
  macroPriority: 3,
  microPriority: 1,
  /** Relative deviation squared: overdose side multiplier for micronutrients. */
  microOverdoseFactor: 2,
  microUnderdoseFactor: 1,
  macroOverdoseFactor: 1.25,
  macroUnderdoseFactor: 1,
  /** Penalise achieved > 0 when target is 0: (A / ref)² × weight. */
  zeroTargetReferencePpm: 0.05,
  unsolicitedElementWeight: 0.75,
};

const MACRO_GROUPS = new Set(['N', 'N_NO3', 'N_NH4', 'N_UREA', 'P', 'K', 'Ca', 'Mg', 'S']);

function isMacro(group: string): boolean {
  return MACRO_GROUPS.has(group);
}

function resolvePriority(group: string, config: SolverObjectiveConfig): number {
  const custom = config.elementPriorityWeight?.[group];
  if (custom != null) return custom;
  return isMacro(group) ? (config.macroPriority ?? 3) : (config.microPriority ?? 1);
}

function asymFactor(
  group: string,
  relativeDeviation: number,
  config: SolverObjectiveConfig,
): number {
  const over = relativeDeviation > 0;
  if (isMacro(group)) {
    return over
      ? (config.macroOverdoseFactor ?? 1.25)
      : (config.macroUnderdoseFactor ?? 1);
  }
  return over
    ? (config.microOverdoseFactor ?? 2)
    : (config.microUnderdoseFactor ?? 1);
}

/**
 * Weighted sum of squared **relative** deviations (owner-approved objective).
 * Lower is better. Does not include hard-constraint violations (caller sets ∞).
 */
export function computeObjective(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): number {
  let sum = 0;
  let weightSum = 0;

  const allGroups = new Set([...groups, ...Object.keys(achieved)]);

  for (const g of allGroups) {
    const T = target[g] ?? 0;
    const A = achieved[g] ?? 0;
    const w = resolvePriority(g, config);

    if (T > 0) {
      const rel = (A - T) / T;
      const asym = asymFactor(g, rel, config);
      sum += w * asym * rel * rel;
      weightSum += w;
    } else if (A > 0) {
      const ref = config.zeroTargetReferencePpm ?? 0.05;
      const rel = A / ref;
      const uw = config.unsolicitedElementWeight ?? 0.75;
      sum += uw * rel * rel;
      weightSum += uw;
    }
  }

  return weightSum > 0 ? sum / weightSum : 0;
}
