import {
  checkHardConstraints,
  satisfiesHardConstraints,
  type ConstraintContext,
} from './constraints';
import { buildHydroodoMatrix, hydroodoContributionsFromDose } from './hydroodo-model';
import { computeObjective, DEFAULT_SOLVER_OBJECTIVE } from './objective';
import { buildContributionMatrix, multiplyMatrixVector } from './matrix';
import { boundedNnls } from './nnls';
import type { ElementKey, FertilizerSpec, SolveForwardOptions, SolverObjectiveConfig } from './types';

const DOSE_STEP = 0.001;
const DEFAULT_MAX_DOSE = 4;

function roundStep(d: number): number {
  return Math.round(d / DOSE_STEP) * DOSE_STEP;
}

function achievedFromX(
  A: number[][],
  groups: string[],
  x: number[],
): Record<string, number> {
  const vec = multiplyMatrixVector(A, x);
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) out[groups[i]] = vec[i];
  return out;
}

function nh4AndNTotal(
  fertilizers: FertilizerSpec[],
  x: number[],
  hydroodo: boolean,
): { nh4: number; nTotal: number } {
  let nh4 = 0;
  let nTotal = 0;
  for (let j = 0; j < fertilizers.length; j++) {
    if (x[j] <= 0) continue;
    const declared = fertilizers[j].declaredPct ?? {};
    if (hydroodo) {
      const part = hydroodoContributionsFromDose(declared, x[j]);
      nTotal += part.groupsMgL.N ?? 0;
      nh4 += part.nFormsMgL.NH4;
    } else {
      const pct = fertilizers[j].elementalPct ?? {};
      nTotal += (pct.N_NO3 ?? 0) * (x[j] / 100) * 1000;
      nTotal += (pct.N_NH4 ?? 0) * (x[j] / 100) * 1000;
      nTotal += (pct.N_UREA ?? 0) * (x[j] / 100) * 1000;
      nh4 += (pct.N_NH4 ?? 0) * (x[j] / 100) * 1000;
    }
  }
  return { nh4, nTotal };
}

function tieBreakScore(
  x: number[],
  fertilizers: FertilizerSpec[],
  objective: number,
  options?: SolveForwardOptions,
): number {
  const used = x.filter((v) => v > 1e-6).length;
  let cost = 0;
  if (options?.productCostPerL) {
    for (let j = 0; j < fertilizers.length; j++) {
      const c = options.productCostPerL[fertilizers[j].id];
      if (c != null) cost += c * x[j];
    }
  }
  return objective * 1e6 + used * 1e3 + cost;
}

function evaluate(
  x: number[],
  A: number[][],
  groups: string[],
  netTarget: Record<string, number>,
  fertilizers: FertilizerSpec[],
  hydroodo: boolean,
  options?: SolveForwardOptions,
  objectiveConfig?: SolverObjectiveConfig,
): number {
  const achieved = achievedFromX(A, groups, x);
  const { nh4, nTotal } = nh4AndNTotal(fertilizers, x, hydroodo);
  const ctx: ConstraintContext = {
    groups,
    netTarget,
    achieved,
    doses: x,
    maxDosePerL: fertilizers.map((f) => f.maxDosePerL ?? DEFAULT_MAX_DOSE),
    options,
    nh4MgL: nh4,
    nTotalMgL: nTotal,
    ecMsCm: options?.ecEstimateMsCm?.(achieved),
  };
  if (!satisfiesHardConstraints(ctx)) return Infinity;

  const obj = computeObjective(
    groups,
    netTarget,
    achieved,
    objectiveConfig ?? options?.objective ?? DEFAULT_SOLVER_OBJECTIVE,
  );
  return tieBreakScore(x, fertilizers, obj, options);
}

function scanDose(
  center: number,
  maxD: number,
  refine: boolean,
): number[] {
  const values: number[] = [];
  if (!refine) {
    for (let t = 0; t <= maxD / DOSE_STEP + 1; t++) values.push(roundStep(t * DOSE_STEP));
    return values;
  }
  const window = Math.min(0.6, maxD);
  const steps = Math.ceil(window / DOSE_STEP);
  for (let ti = -steps; ti <= steps; ti++) {
    values.push(roundStep(Math.min(maxD, Math.max(0, center + ti * DOSE_STEP))));
  }
  return values;
}

export function solveCapAwareCoordinate(
  fertilizers: FertilizerSpec[],
  groups: string[],
  netTarget: Record<string, number>,
  hydroodo: boolean,
  options?: SolveForwardOptions,
  maxIter = 8,
): number[] {
  const A = hydroodo
    ? buildHydroodoMatrix(
        fertilizers.map((f) => ({ declaredPct: f.declaredPct! })),
        groups,
      )
    : buildContributionMatrix(fertilizers, groups as ElementKey[]);

  const n = fertilizers.length;
  const b = groups.map((g) => netTarget[g] ?? 0);
  const weights = groups.map((g) =>
    ['N', 'N_NO3', 'N_NH4', 'P', 'K'].includes(g) ? 3 : ['Ca', 'Mg', 'S'].includes(g) ? 2 : 1,
  );
  const upper = fertilizers.map((f) => f.maxDosePerL ?? DEFAULT_MAX_DOSE);
  let x = boundedNnls(A, b, weights, new Array(n).fill(0), upper).x;
  let best = evaluate(x, A, groups, netTarget, fertilizers, hydroodo, options);

  function refinePairLocal(j: number, k: number, window = 0.12): void {
    const steps = Math.ceil(window / DOSE_STEP);
    const maxDj = fertilizers[j].maxDosePerL ?? DEFAULT_MAX_DOSE;
    const maxDk = fertilizers[k].maxDosePerL ?? DEFAULT_MAX_DOSE;
    for (let ti = -steps; ti <= steps; ti++) {
      for (let tk = -steps; tk <= steps; tk++) {
        const xv = x.slice();
        xv[j] = roundStep(Math.min(maxDj, Math.max(0, x[j] + ti * DOSE_STEP)));
        xv[k] = roundStep(Math.min(maxDk, Math.max(0, x[k] + tk * DOSE_STEP)));
        const s = evaluate(xv, A, groups, netTarget, fertilizers, hydroodo, options);
        if (s < best) {
          best = s;
          x[j] = xv[j];
          x[k] = xv[k];
        }
      }
    }
  }

  for (let pass = 0; pass < maxIter; pass++) {
    const refine = pass > 1;
    let improved = false;
    for (let j = 0; j < n; j++) {
      const maxD = fertilizers[j].maxDosePerL ?? DEFAULT_MAX_DOSE;
      let localBest = x[j];
      let localScore = best;

      for (const d of scanDose(x[j], maxD, refine)) {
        const xv = x.slice();
        xv[j] = d;
        const s = evaluate(xv, A, groups, netTarget, fertilizers, hydroodo, options);
        if (s < localScore) {
          localScore = s;
          localBest = d;
        }
      }

      if (localScore < best) {
        x[j] = localBest;
        best = localScore;
        improved = true;
      }
    }
    if (!improved) break;
  }

  if (n <= 6) {
    for (let j = 0; j < n; j++) {
      for (let k = j + 1; k < n; k++) refinePairLocal(j, k);
    }
  }

  const rounded = x.map(roundStep);
  const roundedScore = evaluate(
    rounded,
    A,
    groups,
    netTarget,
    fertilizers,
    hydroodo,
    options,
  );
  let out = roundedScore <= best ? rounded : x.map(roundStep);

  for (let scalePass = 0; scalePass < 24; scalePass++) {
    const nt = nh4AndNTotal(fertilizers, out, hydroodo);
    const ctx: ConstraintContext = {
      groups,
      netTarget,
      achieved: achievedFromX(A, groups, out),
      doses: out,
      maxDosePerL: fertilizers.map((f) => f.maxDosePerL ?? DEFAULT_MAX_DOSE),
      options,
      nh4MgL: nt.nh4,
      nTotalMgL: nt.nTotal,
      ecMsCm: options?.ecEstimateMsCm?.(achievedFromX(A, groups, out)),
    };
    if (satisfiesHardConstraints(ctx)) break;
    out = out.map((v) => roundStep(v * 0.92));
  }

  return out;
}
