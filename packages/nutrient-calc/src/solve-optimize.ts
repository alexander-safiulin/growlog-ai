import {
  buildChemistryMatrix,
  collectGroups,
  nitrogenSplitFromDoses,
  type ChemistryModel,
} from './chemistry-matrix';
import { satisfiesHardConstraints, type ConstraintContext } from './constraints';
import { computeObjective, DEFAULT_SOLVER_OBJECTIVE, objectiveGradient } from './objective';
import { multiplyMatrixVector } from './matrix';
import type { FertilizerSpec, SolveForwardOptions, SolverObjectiveConfig } from './types';

const DOSE_STEP = 0.001;
const MAX_DOSE_DEFAULT = 4;
const N_STARTS = 30;

function roundDose(d: number): number {
  return Number((Math.round(d / DOSE_STEP) * DOSE_STEP).toFixed(3));
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function achievedMap(groups: string[], vec: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    if (Math.abs(vec[i]) > 1e-15) out[groups[i]] = vec[i];
  }
  return out;
}

function clipX(x: number[], maxDose: number[]): number[] {
  return x.map((v, j) => Math.min(maxDose[j], Math.max(0, v)));
}

function capViolationSq(
  groups: string[],
  achieved: number[],
  target: Record<string, number>,
  overdosePct: Record<string, number>,
): number {
  let p = 0;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const t = target[g] ?? 0;
    if (t <= 0) continue;
    const cap = t * (1 + (overdosePct[g] ?? 50) / 100);
    const over = achieved[i] - cap;
    if (over > 0) p += over * over;
  }
  return p;
}

function gradX(
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  x: number[],
  config: SolverObjectiveConfig,
  overdosePct: Record<string, number>,
  mu: number,
): number[] {
  const n = x.length;
  const gradA = objectiveGradient(groups, target, achieved, config);
  const vec = multiplyMatrixVector(A, x);
  const g = new Array(n).fill(0);

  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < groups.length; i++) {
      const gi = groups[i];
      const dOdA = gradA[gi] ?? 0;
      s += dOdA * A[i][j];
      const t = target[gi] ?? 0;
      if (t > 0) {
        const cap = t * (1 + (overdosePct[gi] ?? 50) / 100);
        const over = vec[i] - cap;
        if (over > 0) s += mu * 2 * over * A[i][j];
      }
    }
    g[j] = s;
  }
  return g;
}

function projectedGradient(
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  config: SolverObjectiveConfig,
  overdosePct: Record<string, number>,
  maxDose: number[],
  x0: number[],
  mu: number,
  maxIter: number,
): number[] {
  let x = clipX(x0, maxDose);
  let lr = 0.05;

  for (let iter = 0; iter < maxIter; iter++) {
    const vec = multiplyMatrixVector(A, x);
    const achieved = achievedMap(groups, vec);
    const grad = gradX(A, groups, target, achieved, x, config, overdosePct, mu);

    let gn = 0;
    for (const v of grad) gn += v * v;
    if (Math.sqrt(gn) < 1e-10) break;

    const step = lr / (1 + iter * 0.0015);
    const trial = clipX(
      x.map((v, j) => v - step * grad[j]),
      maxDose,
    );
    const f0 = penalizedScore(A, groups, target, config, overdosePct, x, mu);
    const f1 = penalizedScore(A, groups, target, config, overdosePct, trial, mu);
    if (f1 < f0) {
      x = trial;
      lr = Math.min(0.2, lr * 1.05);
    } else {
      lr *= 0.5;
      if (lr < 1e-6) break;
    }
  }
  return x;
}

function penalizedScore(
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  config: SolverObjectiveConfig,
  overdosePct: Record<string, number>,
  x: number[],
  mu: number,
): number {
  const vec = multiplyMatrixVector(A, x);
  const achieved = achievedMap(groups, vec);
  const obj = computeObjective(groups, target, achieved, config);
  return obj + mu * capViolationSq(groups, vec, target, overdosePct);
}

function nelderMead(
  fn: (x: number[]) => number,
  x0: number[],
  bounds: Array<[number, number]>,
  maxIter = 350,
): number[] {
  const n = x0.length;
  const clip = (x: number[]) =>
    x.map((v, i) => Math.min(bounds[i][1], Math.max(bounds[i][0], v)));

  const simplex: number[][] = [clip(x0)];
  for (let i = 0; i < n; i++) {
    const p = clip(x0.map((v, j) => (j === i ? Math.min(bounds[i][1], v + 0.2) : v)));
    simplex.push(p);
  }
  const f = simplex.map((p) => fn(p));

  for (let iter = 0; iter < maxIter; iter++) {
    const order = simplex.map((_, i) => i).sort((a, b) => f[a] - f[b]);
    const best = order[0];
    const worst = order[n];
    const xBar = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) xBar[i] += simplex[order[j]][i] / n;
    }

    const alpha = 1;
    const gamma = 2;
    const rho = 0.5;
    const sigma = 0.5;

    const xr = clip(xBar.map((v, i) => v + alpha * (v - simplex[worst][i])));
    const fr = fn(xr);
    if (fr < f[best] && fr < f[order[n - 1]]) {
      const xe = clip(xBar.map((v, i) => v + gamma * (xr[i] - v)));
      const fe = fn(xe);
      if (fe < fr) {
        simplex[worst] = xe;
        f[worst] = fe;
      } else {
        simplex[worst] = xr;
        f[worst] = fr;
      }
      continue;
    }
    if (fr < f[worst]) {
      simplex[worst] = xr;
      f[worst] = fr;
      continue;
    }
    const xc = clip(xBar.map((v, i) => v + rho * (simplex[worst][i] - v)));
    const fc = fn(xc);
    if (fc < f[worst]) {
      simplex[worst] = xc;
      f[worst] = fc;
      continue;
    }
    for (let i = 1; i <= n; i++) {
      simplex[i] = clip(simplex[best].map((v, j) => v + sigma * (simplex[i][j] - v)));
      f[i] = fn(simplex[i]);
    }
  }
  let bestI = 0;
  for (let i = 1; i <= n; i++) if (f[i] < f[bestI]) bestI = i;
  return clip(simplex[bestI]);
}

function localPolish(
  x: number[],
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options: SolveForwardOptions | undefined,
): number[] {
  const maxDose = fertilizers.map((f) => f.maxDosePerL ?? MAX_DOSE_DEFAULT);
  let best = x.map((v, j) => roundDose(Math.min(maxDose[j], Math.max(0, v))));
  let bestScore = scoreState(best, A, groups, target, fertilizers, model, options);

  const window = 12;
  for (let pass = 0; pass < 4; pass++) {
    for (let j = 0; j < best.length; j++) {
      if (best[j] > 0 && best[j] <= 0.01) {
        const zeroTrial = best.slice();
        zeroTrial[j] = 0;
        const sz = scoreState(zeroTrial, A, groups, target, fertilizers, model, options);
        if (sz < bestScore) {
          bestScore = sz;
          best = zeroTrial;
        }
      }
      for (let d = -window; d <= window; d++) {
        if (d === 0) continue;
        const trial = best.slice();
        trial[j] = roundDose(Math.min(maxDose[j], Math.max(0, best[j] + d * DOSE_STEP)));
        const s = scoreState(trial, A, groups, target, fertilizers, model, options);
        if (s < bestScore) {
          bestScore = s;
          best = trial;
        }
      }
    }
  }
  return best;
}

function scoreState(
  x: number[],
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options?: SolveForwardOptions,
): number {
  const vec = multiplyMatrixVector(A, x);
  const achieved = achievedMap(groups, vec);
  const ctx = constraintCtx(groups, target, achieved, x, fertilizers, model, options);
  if (!satisfiesHardConstraints(ctx)) return Infinity;
  const config = options?.objective ?? DEFAULT_SOLVER_OBJECTIVE;
  const obj = computeObjective(groups, target, achieved, config);
  const used = x.filter((v) => v > 0).length;
  let cost = 0;
  if (options?.productCostPerL) {
    for (let j = 0; j < fertilizers.length; j++) {
      const c = options.productCostPerL[fertilizers[j].id];
      if (c != null) cost += c * x[j];
    }
  }
  return obj + used * 1e-9 + cost * 1e-10;
}

function constraintCtx(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
  x: number[],
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options?: SolveForwardOptions,
): ConstraintContext {
  const nt = nitrogenSplitFromDoses(fertilizers, x, model);
  const nh4Worst = nt.nh4 + nt.unknown;
  return {
    groups,
    netTarget: target,
    achieved,
    doses: x,
    maxDosePerL: fertilizers.map((f) => f.maxDosePerL ?? MAX_DOSE_DEFAULT),
    options,
    nh4MgL: nh4Worst,
    nTotalMgL: nt.nTotal,
    ecMsCm: options?.ecEstimateMsCm?.(achieved),
  };
}

function macroWarmStart(
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  maxDose: number[],
): number[] {
  const n = maxDose.length;
  const x = new Array(n).fill(0);
  const macros = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];
  for (const g of macros) {
    const t = target[g] ?? 0;
    if (t <= 0) continue;
    const i = groups.indexOf(g);
    if (i < 0) continue;
    let bestJ = -1;
    let bestCoeff = 0;
    for (let j = 0; j < n; j++) {
      const c = A[i][j];
      if (c > bestCoeff) {
        bestCoeff = c;
        bestJ = j;
      }
    }
    if (bestJ >= 0 && bestCoeff > 1e-9) {
      x[bestJ] = Math.min(maxDose[bestJ], Math.max(x[bestJ], t / bestCoeff));
    }
  }
  return clipX(x, maxDose);
}

function optimizeFromStart(
  x0: number[],
  A: number[][],
  groups: string[],
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options: SolveForwardOptions | undefined,
): number[] {
  const config = options?.objective ?? DEFAULT_SOLVER_OBJECTIVE;
  const overdosePct = options?.overdosePctByGroup ?? {};
  const maxDose = fertilizers.map((f) => f.maxDosePerL ?? MAX_DOSE_DEFAULT);
  const mu = 2e3;
  const bounds = maxDose.map((m) => [0, m] as [number, number]);
  const penalized = (x: number[]) =>
    penalizedScore(A, groups, target, config, overdosePct, x, mu);

  const xGrad = projectedGradient(A, groups, target, config, overdosePct, maxDose, x0, mu, 480);
  const xNm = nelderMead(penalized, xGrad, bounds, 300);
  const xNm2 = nelderMead(penalized, x0, bounds, 220);

  let best = xGrad;
  let bestP = penalized(best);
  for (const cand of [xNm, xNm2, x0]) {
    const p = penalized(cand);
    if (p < bestP) {
      bestP = p;
      best = cand;
    }
  }
  return localPolish(best, A, groups, target, fertilizers, model, options);
}

export function solveCapAware(
  fertilizers: FertilizerSpec[],
  target: Record<string, number>,
  model: ChemistryModel,
  options?: SolveForwardOptions,
): { x: number[]; groups: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const groups = collectGroups(fertilizers, target, model);
  const A = buildChemistryMatrix(fertilizers, groups, model);
  const n = fertilizers.length;
  const maxDose = fertilizers.map((f) => f.maxDosePerL ?? MAX_DOSE_DEFAULT);

  let bestX = new Array(n).fill(0);
  let bestScore = Infinity;

  const warm = macroWarmStart(A, groups, target, maxDose);

  for (let s = 0; s < N_STARTS; s++) {
    const rng = mulberry32(1000 + s);
    let x0: number[];
    if (s === 0) x0 = new Array(n).fill(1);
    else if (s === 1) x0 = warm.slice();
    else if (s === 2) x0 = new Array(n).fill(0);
    else x0 = Array.from({ length: n }, () => rng() * 2);

    const polished = optimizeFromStart(x0, A, groups, target, fertilizers, model, options);
    const sc = scoreState(polished, A, groups, target, fertilizers, model, options);
    if (sc < bestScore) {
      bestScore = sc;
      bestX = polished;
    }
  }

  const achieved = achievedMap(groups, multiplyMatrixVector(A, bestX));
  const nt = nitrogenSplitFromDoses(fertilizers, bestX, model);
  if (nt.unknown > 0) warnings.push('nitrogen_form_unknown');
  if (options?.maxAmmoniumShare != null && nt.nTotal > 0) {
    const share = (nt.nh4 + nt.unknown) / nt.nTotal;
    if (share > options.maxAmmoniumShare + 1e-6) warnings.push('nh4_share_worst_case');
  }

  if (options?.minMatchPct != null) {
    const vec = multiplyMatrixVector(A, bestX);
    const achievedOnly = achievedMap(groups, vec);
    const targeted = Object.keys(target).filter((g) => (target[g] ?? 0) > 0);
    const scores = targeted.map((g) => {
      const t = target[g]!;
      const a = achievedOnly[g] ?? 0;
      return Math.max(0, 100 - Math.abs((a / t) * 100 - 100));
    });
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    if (avg < options.minMatchPct) warnings.push('below_min_match_threshold');
  }

  if (
    !satisfiesHardConstraints(
      constraintCtx(groups, target, achieved, bestX, fertilizers, model, options),
    )
  ) {
    warnings.push('infeasible_best_effort');
  }

  return { x: bestX.map(roundDose), groups, warnings };
}
