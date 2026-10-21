import type { SolverObjectiveConfig } from './types';

export const MACRO_GROUPS = ['N', 'N_NO3', 'N_NH4', 'N_UREA', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

/** Typical background ppm for unsolicited-element penalty (documented in MATCH_METRIC.md). */
export const UNSOLICITED_REFERENCE_PPM: Record<string, number> = {
  N: 80,
  P: 40,
  K: 150,
  Ca: 80,
  Mg: 30,
  S: 50,
  B: 0.3,
  Fe: 2,
  Mn: 0.5,
  Zn: 0.3,
  Cu: 0.05,
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
};

function isMacro(group: string): boolean {
  return (MACRO_GROUPS as readonly string[]).includes(group);
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

export function computeObjective(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): number {
  let sum = 0;
  let weightSum = 0;
  const all = new Set([...groups, ...Object.keys(achieved), ...Object.keys(target)]);

  for (const g of all) {
    const T = target[g] ?? 0;
    const A = achieved[g] ?? 0;
    if (T > 0) {
      const rel = (A - T) / T;
      const pw = resolvePriority(g, config);
      sum += pw * asymFactor(g, rel, config) * rel * rel;
      weightSum += pw;
    } else if (A > 1e-12) {
      const ref = refPpm(g, config);
      const rel = A / ref;
      const uw = config.unsolicitedElementWeight ?? 0.75;
      sum += uw * rel * rel;
      weightSum += uw;
    }
  }

  return weightSum > 0 ? sum / weightSum : 0;
}

/** ∂objective/∂achieved_g (subgradient; asym treated piecewise-constant). */
export function objectiveGradient(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  config: SolverObjectiveConfig = DEFAULT_SOLVER_OBJECTIVE,
): Record<string, number> {
  const grad: Record<string, number> = {};
  const all = new Set([...groups, ...Object.keys(achieved), ...Object.keys(target)]);
  let weightSum = 0;

  for (const g of all) {
    const T = target[g] ?? 0;
    const A = achieved[g] ?? 0;
    if (T > 0) weightSum += resolvePriority(g, config);
    else if (A > 1e-12) weightSum += config.unsolicitedElementWeight ?? 0.75;
  }
  if (weightSum <= 0) return grad;

  for (const g of all) {
    const T = target[g] ?? 0;
    const A = achieved[g] ?? 0;
    if (T > 0) {
      const rel = (A - T) / T;
      const pw = resolvePriority(g, config);
      const asym = asymFactor(g, rel, config);
      grad[g] = (pw * 2 * asym * rel) / (T * weightSum);
    } else if (A > 1e-12) {
      const ref = refPpm(g, config);
      const rel = A / ref;
      const uw = config.unsolicitedElementWeight ?? 0.75;
      grad[g] = (uw * 2 * rel) / (ref * weightSum);
    }
  }
  return grad;
}
