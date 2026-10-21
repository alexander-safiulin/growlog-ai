import {
  buildChemistryMatrix,
  collectGroups,
  nitrogenSplitFromDoses,
  type ChemistryModel,
} from './chemistry-matrix';
import { satisfiesHardConstraints, type ConstraintContext } from './constraints';
import { computeObjective, DEFAULT_SOLVER_OBJECTIVE, objectiveGradient } from './objective';
import type { FertilizerSpec, SolveForwardOptions, SolverObjectiveConfig } from './types';

const DOSE_STEP = 0.001;
const MAX_DOSE_DEFAULT = 4;
const N_STARTS = 14;
const STALE_STARTS = 4;

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

interface ProblemCache {
  groups: string[];
  rows: number;
  cols: number;
  aFlat: Float64Array;
  maxDose: number[];
}

function buildProblemCache(
  fertilizers: FertilizerSpec[],
  groups: string[],
  A: number[][],
): ProblemCache {
  const rows = groups.length;
  const cols = fertilizers.length;
  const aFlat = new Float64Array(rows * cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) aFlat[i * cols + j] = A[i][j];
  }
  return {
    groups,
    rows,
    cols,
    aFlat,
    maxDose: fertilizers.map((f) => f.maxDosePerL ?? MAX_DOSE_DEFAULT),
  };
}

function matVec(cache: ProblemCache, x: number[]): Float64Array {
  const { rows, cols, aFlat } = cache;
  const out = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    const row = i * cols;
    for (let j = 0; j < cols; j++) sum += aFlat[row + j] * x[j];
    out[i] = sum;
  }
  return out;
}

function achievedMap(groups: string[], vec: Float64Array | number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const v = vec[i];
    if (Math.abs(v) > 1e-15) out[groups[i]] = v;
  }
  return out;
}

function clipX(x: number[], maxDose: number[]): number[] {
  return x.map((v, j) => Math.min(maxDose[j], Math.max(0, v)));
}

function capViolationSq(
  groups: string[],
  achieved: Float64Array,
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
  cache: ProblemCache,
  target: Record<string, number>,
  achieved: Record<string, number>,
  vec: Float64Array,
  config: SolverObjectiveConfig,
  overdosePct: Record<string, number>,
  mu: number,
): Float64Array {
  const { groups, cols, aFlat } = cache;
  const gradA = objectiveGradient(groups, target, achieved, config);
  const g = new Float64Array(cols);

  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < groups.length; i++) {
      const gi = groups[i];
      const aij = aFlat[i * cols + j];
      s += (gradA[gi] ?? 0) * aij;
      const t = target[gi] ?? 0;
      if (t > 0) {
        const cap = t * (1 + (overdosePct[gi] ?? 50) / 100);
        const over = vec[i] - cap;
        if (over > 0) s += mu * 2 * over * aij;
      }
    }
    g[j] = s;
  }
  return g;
}

function penalizedScore(
  cache: ProblemCache,
  target: Record<string, number>,
  config: SolverObjectiveConfig,
  overdosePct: Record<string, number>,
  x: number[],
  mu: number,
): number {
  const vec = matVec(cache, x);
  const achieved = achievedMap(cache.groups, vec);
  const obj = computeObjective(cache.groups, target, achieved, config);
  return obj + mu * capViolationSq(cache.groups, vec, target, overdosePct);
}

function projectedGradient(
  cache: ProblemCache,
  target: Record<string, number>,
  config: SolverObjectiveConfig,
  overdosePct: Record<string, number>,
  x0: number[],
  mu: number,
  maxIter: number,
): number[] {
  const maxDose = cache.maxDose;
  let x = clipX(x0, maxDose);
  let lr = 0.06;

  for (let iter = 0; iter < maxIter; iter++) {
    const vec = matVec(cache, x);
    const achieved = achievedMap(cache.groups, vec);
    const grad = gradX(cache, target, achieved, vec, config, overdosePct, mu);

    let gn = 0;
    for (let j = 0; j < grad.length; j++) gn += grad[j] * grad[j];
    if (Math.sqrt(gn) < 1e-10) break;

    const step = lr / (1 + iter * 0.002);
    const trial = clipX(
      x.map((v, j) => v - step * grad[j]),
      maxDose,
    );
    const f0 = penalizedScore(cache, target, config, overdosePct, x, mu);
    const f1 = penalizedScore(cache, target, config, overdosePct, trial, mu);
    if (f1 < f0) {
      x = trial;
      lr = Math.min(0.25, lr * 1.04);
    } else {
      lr *= 0.55;
      if (lr < 1e-6) break;
    }
  }
  return x;
}

function nelderMead(
  fn: (x: number[]) => number,
  x0: number[],
  bounds: Array<[number, number]>,
  maxIter: number,
): number[] {
  const n = x0.length;
  const clip = (x: number[]) =>
    x.map((v, i) => Math.min(bounds[i][1], Math.max(bounds[i][0], v)));

  const simplex: number[][] = [clip(x0)];
  for (let i = 0; i < n; i++) {
    const p = clip(x0.map((v, j) => (j === i ? Math.min(bounds[i][1], v + 0.15) : v)));
    simplex.push(p);
  }
  const f = simplex.map((p) => fn(p));

  for (let iter = 0; iter < maxIter; iter++) {
    const order = simplex.map((_, i) => i).sort((a, b) => f[a] - f[b]);
    const best = order[0];
    const worst = order[n];
    const xBar = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) xBar[j] += simplex[order[k]][j] / n;
    }

    const xr = clip(xBar.map((v, i) => v + (v - simplex[worst][i])));
    const fr = fn(xr);
    if (fr < f[best] && fr < f[order[n - 1]]) {
      const xe = clip(xBar.map((v, i) => v + 2 * (xr[i] - v)));
      const fe = fn(xe);
      simplex[worst] = fe < fr ? xe : xr;
      f[worst] = fe < fr ? fe : fr;
      continue;
    }
    if (fr < f[worst]) {
      simplex[worst] = xr;
      f[worst] = fr;
      continue;
    }
    const xc = clip(xBar.map((v, i) => v + 0.5 * (simplex[worst][i] - v)));
    const fc = fn(xc);
    if (fc < f[worst]) {
      simplex[worst] = xc;
      f[worst] = fc;
      continue;
    }
    for (let i = 1; i <= n; i++) {
      simplex[i] = clip(simplex[best].map((v, j) => v + 0.5 * (simplex[i][j] - v)));
      f[i] = fn(simplex[i]);
    }
  }
  let bestI = 0;
  for (let i = 1; i <= n; i++) if (f[i] < f[bestI]) bestI = i;
  return clip(simplex[bestI]);
}

function localPolish(
  x: number[],
  cache: ProblemCache,
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options: SolveForwardOptions | undefined,
  passes: number,
  window: number,
): number[] {
  const maxDose = cache.maxDose;
  let best = x.map((v, j) => roundDose(Math.min(maxDose[j], Math.max(0, v))));
  let bestScore = scoreState(best, cache, target, fertilizers, model, options);

  for (let pass = 0; pass < passes; pass++) {
    for (let j = 0; j < best.length; j++) {
      if (best[j] > 0 && best[j] <= 0.01) {
        const zeroTrial = best.slice();
        zeroTrial[j] = 0;
        const sz = scoreState(zeroTrial, cache, target, fertilizers, model, options);
        if (sz < bestScore) {
          bestScore = sz;
          best = zeroTrial;
        }
      }
      for (let d = -window; d <= window; d++) {
        if (d === 0) continue;
        const trial = best.slice();
        trial[j] = roundDose(Math.min(maxDose[j], Math.max(0, best[j] + d * DOSE_STEP)));
        const s = scoreState(trial, cache, target, fertilizers, model, options);
        if (s < bestScore) {
          bestScore = s;
          best = trial;
        }
      }
    }
  }
  return best;
}

/** Joint dose polish on product pairs (coarse-to-fine 0.001 grid; small n only). */
function pairLocalPolish(
  x: number[],
  cache: ProblemCache,
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options: SolveForwardOptions | undefined,
  passes: number,
  window: number,
): number[] {
  const maxDose = cache.maxDose;
  let best = x.map((v, j) => roundDose(Math.min(maxDose[j], Math.max(0, v))));
  let bestScore = scoreState(best, cache, target, fertilizers, model, options);
  const n = best.length;
  if (n > 8) return best;

  const tryPairFull = (i: number, j: number, win: number) => {
    for (let di = -win; di <= win; di++) {
      for (let dj = -win; dj <= win; dj++) {
        if (di === 0 && dj === 0) continue;
        const trial = best.slice();
        trial[i] = roundDose(
          Math.min(maxDose[i], Math.max(0, best[i] + di * DOSE_STEP)),
        );
        trial[j] = roundDose(
          Math.min(maxDose[j], Math.max(0, best[j] + dj * DOSE_STEP)),
        );
        const s = scoreState(trial, cache, target, fertilizers, model, options);
        if (s < bestScore) {
          bestScore = s;
          best = trial;
        }
      }
    }
  };

  const tryPair = (i: number, j: number, stepMul: number, win: number) => {
    for (let di = -win; di <= win; di++) {
      for (let dj = -win; dj <= win; dj++) {
        if (di === 0 && dj === 0) continue;
        const trial = best.slice();
        trial[i] = roundDose(
          Math.min(maxDose[i], Math.max(0, best[i] + di * stepMul * DOSE_STEP)),
        );
        trial[j] = roundDose(
          Math.min(maxDose[j], Math.max(0, best[j] + dj * stepMul * DOSE_STEP)),
        );
        const s = scoreState(trial, cache, target, fertilizers, model, options);
        if (s < bestScore) {
          bestScore = s;
          best = trial;
        }
      }
    }
  };

  if (n === 4 && window >= 40) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        tryPairFull(i, j, window);
      }
    }
    return best;
  }

  const coarseWin = Math.max(1, Math.ceil(window / 5));
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        tryPair(i, j, 5, coarseWin);
        tryPair(i, j, 1, Math.min(12, window));
      }
    }
  }
  return best;
}

function scoreState(
  x: number[],
  cache: ProblemCache,
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options?: SolveForwardOptions,
): number {
  const vec = matVec(cache, x);
  const achieved = achievedMap(cache.groups, vec);
  const ctx = constraintCtx(cache.groups, target, achieved, x, fertilizers, model, options);
  if (!satisfiesHardConstraints(ctx)) return Infinity;
  const config = options?.objective ?? DEFAULT_SOLVER_OBJECTIVE;
  const obj = computeObjective(cache.groups, target, achieved, config);
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

function macroWarmStart(cache: ProblemCache, target: Record<string, number>): number[] {
  const n = cache.cols;
  const x = new Array(n).fill(0);
  const macros = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];
  for (const g of macros) {
    const t = target[g] ?? 0;
    if (t <= 0) continue;
    const i = cache.groups.indexOf(g);
    if (i < 0) continue;
    for (let j = 0; j < n; j++) {
      const c = cache.aFlat[i * cache.cols + j];
      if (c > 1e-9) {
        x[j] = Math.min(cache.maxDose[j], Math.max(x[j], t / c));
      }
    }
  }
  return clipX(x, cache.maxDose);
}

function optimizeFromStart(
  x0: number[],
  cache: ProblemCache,
  target: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  options: SolveForwardOptions | undefined,
  gradIters: number,
  nmIters: number,
  polish: boolean,
): number[] {
  const config = options?.objective ?? DEFAULT_SOLVER_OBJECTIVE;
  const overdosePct = options?.overdosePctByGroup ?? {};
  const mu = 2e3;
  const bounds = cache.maxDose.map((m) => [0, m] as [number, number]);
  const penalized = (x: number[]) =>
    penalizedScore(cache, target, config, overdosePct, x, mu);

  const xGrad = projectedGradient(cache, target, config, overdosePct, x0, mu, gradIters);
  let best = xGrad;
  const bestP = penalized(best);
  if (nmIters > 0) {
    const xNm = nelderMead(penalized, xGrad, bounds, nmIters);
    const p = penalized(xNm);
    if (p < bestP) best = xNm;
  }
  if (!polish) return best;
  return localPolish(best, cache, target, fertilizers, model, options, 2, 8);
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
  const cache = buildProblemCache(fertilizers, groups, A);
  const n = fertilizers.length;

  let bestX = new Array(n).fill(0);
  let bestScore = Infinity;
  let stale = 0;
  const warm = macroWarmStart(cache, target);

  for (let s = 0; s < N_STARTS; s++) {
    const rng = mulberry32(2000 + s);
    let x0: number[];
    if (s === 0) x0 = warm;
    else if (s === 1) x0 = new Array(n).fill(0);
    else x0 = Array.from({ length: n }, () => rng() * 2);

    const polished = optimizeFromStart(
      x0,
      cache,
      target,
      fertilizers,
      model,
      options,
      100,
      60,
      true,
    );
    const sc = scoreState(polished, cache, target, fertilizers, model, options);
    if (sc < bestScore - 1e-8) {
      bestScore = sc;
      bestX = polished;
      stale = 0;
    } else {
      stale += 1;
      if (stale >= STALE_STARTS && s >= 6) break;
    }
  }

  bestX = optimizeFromStart(bestX, cache, target, fertilizers, model, options, 280, 120, false);
  bestX = optimizeFromStart(bestX, cache, target, fertilizers, model, options, 500, 200, false);
  if (n <= 6) {
    const pairWindow = n <= 4 ? 60 : 35;
    bestX = pairLocalPolish(bestX, cache, target, fertilizers, model, options, 2, pairWindow);
  }
  bestX = localPolish(bestX, cache, target, fertilizers, model, options, 8, 20);

  const achieved = achievedMap(cache.groups, matVec(cache, bestX));
  const nt = nitrogenSplitFromDoses(fertilizers, bestX, model);
  if (nt.unknown > 0) warnings.push('nitrogen_form_unknown');
  if (options?.maxAmmoniumShare != null && nt.nTotal > 0) {
    const share = (nt.nh4 + nt.unknown) / nt.nTotal;
    if (share > options.maxAmmoniumShare + 1e-6) warnings.push('nh4_share_worst_case');
  }

  if (options?.minMatchPct != null) {
    const vec = matVec(cache, bestX);
    const achievedOnly = achievedMap(cache.groups, vec);
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
      constraintCtx(cache.groups, target, achieved, bestX, fertilizers, model, options),
    )
  ) {
    warnings.push('infeasible_best_effort');
  }

  return { x: bestX.map(roundDose), groups, warnings };
}
