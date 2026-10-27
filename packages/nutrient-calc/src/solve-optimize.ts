import {
  buildChemistryMatrix,
  collectGroups,
  nitrogenSplitFromDoses,
  type ChemistryModel,
} from './chemistry-matrix';
import {
  DEFAULT_SOLVER_OBJECTIVE,
  isHardCapGroup,
  microGroupsOverCap,
  microSoftCapPenaltyWeight,
  objectiveNormalizer,
  objectiveRowWeights,
  overdoseCeilingPpm,
} from './objective';
import { targetUsesNitrogenForms } from './nitrogen-target';
import {
  augmentMatrixWithLinkedPartB,
  detectManufacturerAbPairs,
  planManufacturerAbLinkage,
  shouldLinkManufacturerAbPairs,
  type ManufacturerAbPair,
} from './manufacturer-ab-pairs';
import type { FertilizerSpec, SolveForwardOptions } from './types';

const DOSE_STEP = 0.001;
const MAX_DOSE_DEFAULT = 4;

const ROW_IGNORED = 0;
const ROW_TARGETED = 1;
const ROW_UNSOLICITED = 2;

const INNER_MAX_ITER = 200;
const OUTER_MAX_ITER = 60;
const EC_LINEARIZATION_PASSES = 8;
const PROJ_GRAD_TOL = 1e-11;
const CONSTRAINT_TOL = 1e-10;
const RHO_START = 10;
const RHO_MAX = 1e12;

const POLISH_MOVE_STEPS = [1, 5, 20] as const;
const POLISH_MOVE_EVALS = 4000;
const POLISH_ENUMERATE_MAX_N = 10;
const POLISH_PAIR_MAX_N = 8;
const POLISH_PAIR_RADIUS = 8;
const ROUNDING_SENSITIVE_DOSE = 0.1;
const ROUNDING_SENSITIVE_MAX = 3;
const ROUNDING_GAP_TOL = 1e-5;

const INFEASIBLE_SCORE = 1e6;

function roundDose(d: number): number {
  return Number((Math.round(d / DOSE_STEP) * DOSE_STEP).toFixed(3));
}

interface LinearConstraint {
  /** `g · x ≤ h` with g scaled to unit max-abs entry. */
  g: Float64Array;
  h: number;
  kind: 'cap' | 'nh4' | 'ec';
}

/**
 * Convex dose problem: piecewise-quadratic objective in achieved ppm (`A x`), box bounds on doses,
 * linear hard constraints (macro caps, NH₄ share, linearised EC).
 */
interface Problem {
  groups: string[];
  n: number;
  m: number;
  a: Float64Array;
  rowKind: Int8Array;
  rowT: Float64Array;
  rowPw: Float64Array;
  rowOver: Float64Array;
  rowUnder: Float64Array;
  rowUnsolicited: Float64Array;
  rowUnsolicitedFree: Float64Array;
  rowSoftCap: Float64Array;
  softCapPenalty: number;
  invW: number;
  constTerm: number;
  lb: Float64Array;
  ub: Float64Array;
  cons: LinearConstraint[];
  nh4Worst: Float64Array;
  nTotal: Float64Array;
  nUnknown: Float64Array;
  cost: Float64Array | null;
  maxEc?: number;
  ecEstimate?: (achieved: Record<string, number>) => number;
}

function achievedMap(groups: string[], vec: Float64Array | number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const v = vec[i];
    if (Math.abs(v) > 1e-15) out[groups[i]] = v;
  }
  return out;
}

function matVec(
  p: Problem,
  x: ArrayLike<number>,
  out: Float64Array = new Float64Array(p.m),
): Float64Array {
  const { m, n, a } = p;
  for (let i = 0; i < m; i++) {
    let s = 0;
    const row = i * n;
    for (let j = 0; j < n; j++) s += a[row + j] * x[j];
    out[i] = s;
  }
  return out;
}

function dot(g: Float64Array, x: ArrayLike<number>): number {
  let s = 0;
  for (let j = 0; j < g.length; j++) s += g[j] * x[j];
  return s;
}

function normalizedConstraint(
  coeffs: ArrayLike<number>,
  h: number,
  kind: LinearConstraint['kind'],
): LinearConstraint | null {
  let scale = 0;
  for (let j = 0; j < coeffs.length; j++) scale = Math.max(scale, Math.abs(coeffs[j]));
  if (scale <= 1e-15) return null;
  const g = new Float64Array(coeffs.length);
  for (let j = 0; j < coeffs.length; j++) g[j] = coeffs[j] / scale;
  return { g, h: h / scale, kind };
}

function buildProblem(
  workFerts: FertilizerSpec[],
  groups: string[],
  A: number[][],
  target: Record<string, number>,
  model: ChemistryModel,
  pairs: ManufacturerAbPair[],
  bounds: Array<[number, number]>,
  options?: SolveForwardOptions,
): Problem {
  const config = options?.objective ?? DEFAULT_SOLVER_OBJECTIVE;
  const overdose = options?.overdosePctByGroup;
  const microCap = options?.microOverdoseCap ?? 'soft';
  const m = groups.length;
  const n = workFerts.length;
  const a = new Float64Array(m * n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) a[i * n + j] = A[i][j];

  const rowKind = new Int8Array(m);
  const rowT = new Float64Array(m);
  const rowPw = new Float64Array(m);
  const rowOver = new Float64Array(m);
  const rowUnder = new Float64Array(m);
  const rowUnsolicited = new Float64Array(m);
  const rowUnsolicitedFree = new Float64Array(m);
  const rowSoftCap = new Float64Array(m).fill(Infinity);
  const dropTotalN = targetUsesNitrogenForms(target) && !((target.N ?? 0) > 0);
  const cons: LinearConstraint[] = [];

  for (let i = 0; i < m; i++) {
    const g = groups[i];
    const T = target[g] ?? 0;
    const w = objectiveRowWeights(g, config);
    if (T > 0) {
      rowKind[i] = ROW_TARGETED;
      rowT[i] = T;
      rowPw[i] = w.priority;
      rowOver[i] = w.overFactor;
      rowUnder[i] = w.underFactor;
      const ceiling = overdoseCeilingPpm(g, T, overdose);
      if (isHardCapGroup(g, microCap)) {
        const c = normalizedConstraint(
          Array.from({ length: n }, (_, j) => a[i * n + j]),
          ceiling,
          'cap',
        );
        if (c) cons.push(c);
      } else {
        rowSoftCap[i] = ceiling;
      }
    } else if (g === 'N' && dropTotalN) {
      rowKind[i] = ROW_IGNORED;
    } else {
      rowKind[i] = ROW_UNSOLICITED;
      rowUnsolicited[i] = w.unsolicitedWeight / (w.unsolicitedReferencePpm * w.unsolicitedReferencePpm);
      rowUnsolicitedFree[i] = w.unsolicitedFreePpm;
    }
  }

  let constTerm = 0;
  for (const [g, T] of Object.entries(target)) {
    if ((T ?? 0) <= 0 || groups.includes(g)) continue;
    const w = objectiveRowWeights(g, config);
    constTerm += w.priority * w.underFactor;
  }

  const nh4Worst = new Float64Array(n);
  const nTotal = new Float64Array(n);
  const nUnknown = new Float64Array(n);
  const partBByA = new Map(pairs.map((p) => [p.partA.id, p]));
  for (let j = 0; j < n; j++) {
    const own = nitrogenSplitFromDoses([workFerts[j]], [1], model);
    let nh4 = own.nh4 + own.unknown;
    let tot = own.nTotal;
    let unk = own.unknown;
    const pair = partBByA.get(workFerts[j].id);
    if (pair) {
      const b = nitrogenSplitFromDoses([pair.partB], [pair.ratioBPerA], model);
      nh4 += b.nh4 + b.unknown;
      tot += b.nTotal;
      unk += b.unknown;
    }
    nh4Worst[j] = nh4;
    nTotal[j] = tot;
    nUnknown[j] = unk;
  }
  const maxShare = options?.maxAmmoniumShare;
  if (maxShare != null) {
    const coeffs = Array.from({ length: n }, (_, j) => nh4Worst[j] - maxShare * nTotal[j]);
    if (coeffs.some((c) => c > 1e-12)) {
      const c = normalizedConstraint(coeffs, 0, 'nh4');
      if (c) cons.push(c);
    }
  }

  let cost: Float64Array | null = null;
  if (options?.productCostPerL) {
    cost = new Float64Array(n);
    for (let j = 0; j < n; j++) cost[j] = options.productCostPerL[workFerts[j].id] ?? 0;
  }

  return {
    groups,
    n,
    m,
    a,
    rowKind,
    rowT,
    rowPw,
    rowOver,
    rowUnder,
    rowUnsolicited,
    rowUnsolicitedFree,
    rowSoftCap,
    softCapPenalty: microSoftCapPenaltyWeight(config),
    invW: 1 / objectiveNormalizer(target, config),
    constTerm,
    lb: Float64Array.from(bounds.map((b) => b[0])),
    ub: Float64Array.from(bounds.map((b) => b[1])),
    cons,
    nh4Worst,
    nTotal,
    nUnknown,
    cost,
    maxEc: options?.maxEcMsCm,
    ecEstimate: options?.ecEstimateMsCm,
  };
}

/** Objective (same value as `computeSolverObjective` on net target) and ∂/∂a, ∂²/∂a² per row. */
function rowObjective(
  p: Problem,
  ach: Float64Array,
  dA?: Float64Array,
  ddA?: Float64Array,
): number {
  let sum = p.constTerm;
  for (let i = 0; i < p.m; i++) {
    const v = ach[i];
    let d = 0;
    let dd = 0;
    const kind = p.rowKind[i];
    if (kind === ROW_TARGETED) {
      const T = p.rowT[i];
      const rel = (v - T) / T;
      const s = rel > 0 ? p.rowOver[i] : p.rowUnder[i];
      const pw = p.rowPw[i];
      sum += pw * s * rel * rel;
      d = (2 * pw * s * rel) / T;
      dd = (2 * pw * s) / (T * T);
      const over = v - p.rowSoftCap[i];
      if (over > 0) {
        const k = p.softCapPenalty * pw;
        const r = over / T;
        sum += k * r * r;
        d += (2 * k * r) / T;
        dd += (2 * k) / (T * T);
      }
    } else if (kind === ROW_UNSOLICITED) {
      const excess = v - p.rowUnsolicitedFree[i];
      if (excess > 1e-12) {
        const c = p.rowUnsolicited[i];
        sum += c * excess * excess;
        d = 2 * c * excess;
        dd = 2 * c;
      }
    }
    if (dA) dA[i] = d * p.invW;
    if (ddA) ddA[i] = dd * p.invW;
  }
  return sum * p.invW;
}

interface AugmentedState {
  lam: Float64Array;
  rho: number;
}

function augmentedValue(
  p: Problem,
  x: Float64Array,
  st: AugmentedState,
  grad?: Float64Array,
  hess?: Float64Array,
): number {
  const { n, m, a } = p;
  const ach = matVec(p, x);
  const dA = grad || hess ? new Float64Array(m) : undefined;
  const ddA = hess ? new Float64Array(m) : undefined;
  let f = rowObjective(p, ach, dA, ddA);

  if (grad) {
    grad.fill(0);
    for (let i = 0; i < m; i++) {
      const di = dA![i];
      if (di === 0) continue;
      const row = i * n;
      for (let j = 0; j < n; j++) grad[j] += di * a[row + j];
    }
  }
  if (hess) {
    hess.fill(0);
    for (let i = 0; i < m; i++) {
      const w = ddA![i];
      if (w === 0) continue;
      const row = i * n;
      for (let j = 0; j < n; j++) {
        const aij = a[row + j];
        if (aij === 0) continue;
        const wa = w * aij;
        for (let k = j; k < n; k++) hess[j * n + k] += wa * a[row + k];
      }
    }
  }

  for (let k = 0; k < p.cons.length; k++) {
    const c = p.cons[k];
    const r = dot(c.g, x) - c.h;
    const mu = st.lam[k] + st.rho * r;
    if (mu > 0) {
      f += (mu * mu - st.lam[k] * st.lam[k]) / (2 * st.rho);
      if (grad) for (let j = 0; j < n; j++) grad[j] += mu * c.g[j];
      if (hess) {
        for (let j = 0; j < n; j++) {
          const gj = c.g[j];
          if (gj === 0) continue;
          for (let q = j; q < n; q++) hess[j * n + q] += st.rho * gj * c.g[q];
        }
      }
    } else {
      f -= (st.lam[k] * st.lam[k]) / (2 * st.rho);
    }
  }

  if (hess) {
    for (let j = 0; j < n; j++) for (let k = 0; k < j; k++) hess[j * n + k] = hess[k * n + j];
  }
  return f;
}

/** Solve (H_FF + δI) d = rhs by Cholesky; δ grows until the factorisation succeeds. */
function choleskySolve(H: Float64Array, n: number, idx: number[], rhs: Float64Array): Float64Array | null {
  const k = idx.length;
  let diagMax = 0;
  for (const j of idx) diagMax = Math.max(diagMax, H[j * n + j]);
  let delta = Math.max(diagMax * 1e-12, 1e-14);
  for (let attempt = 0; attempt < 8; attempt++) {
    const L = new Float64Array(k * k);
    let ok = true;
    for (let r = 0; r < k && ok; r++) {
      for (let c = 0; c <= r; c++) {
        let s = H[idx[r] * n + idx[c]] + (r === c ? delta : 0);
        for (let q = 0; q < c; q++) s -= L[r * k + q] * L[c * k + q];
        if (r === c) {
          if (s <= 0) {
            ok = false;
            break;
          }
          L[r * k + r] = Math.sqrt(s);
        } else {
          L[r * k + c] = s / L[c * k + c];
        }
      }
    }
    if (ok) {
      const y = new Float64Array(k);
      for (let r = 0; r < k; r++) {
        let s = rhs[r];
        for (let q = 0; q < r; q++) s -= L[r * k + q] * y[q];
        y[r] = s / L[r * k + r];
      }
      const out = new Float64Array(k);
      for (let r = k - 1; r >= 0; r--) {
        let s = y[r];
        for (let q = r + 1; q < k; q++) s -= L[q * k + r] * out[q];
        out[r] = s / L[r * k + r];
      }
      return out;
    }
    delta *= 100;
  }
  return null;
}

function project(p: Problem, x: Float64Array): Float64Array {
  const out = new Float64Array(p.n);
  for (let j = 0; j < p.n; j++) out[j] = Math.min(p.ub[j], Math.max(p.lb[j], x[j]));
  return out;
}

function projectedGradientStep(
  p: Problem,
  x: Float64Array,
  f: number,
  grad: Float64Array,
  hess: Float64Array,
  st: AugmentedState,
): Float64Array | null {
  const { n } = p;
  let diagMax = 0;
  for (let j = 0; j < n; j++) diagMax = Math.max(diagMax, hess[j * n + j]);
  let step = 1 / Math.max(diagMax, 1e-12);
  for (let ls = 0; ls < 60; ls++) {
    const trial = new Float64Array(n);
    for (let j = 0; j < n; j++) trial[j] = x[j] - step * grad[j];
    const xt = project(p, trial);
    let expected = 0;
    for (let j = 0; j < n; j++) expected += grad[j] * (x[j] - xt[j]);
    if (expected <= 0) return null;
    if (f - augmentedValue(p, xt, st) >= 1e-4 * expected) return xt;
    step *= 0.5;
  }
  return null;
}

/** Bertsekas projected Newton on the box for the (piecewise-quadratic) augmented Lagrangian. */
function projectedNewton(p: Problem, x0: Float64Array, st: AugmentedState): Float64Array {
  const { n } = p;
  let x = project(p, x0);
  const grad = new Float64Array(n);
  const hess = new Float64Array(n * n);
  let f = augmentedValue(p, x, st, grad, hess);

  for (let iter = 0; iter < INNER_MAX_ITER; iter++) {
    let pgNorm = 0;
    for (let j = 0; j < n; j++) {
      const step = Math.min(p.ub[j], Math.max(p.lb[j], x[j] - grad[j])) - x[j];
      pgNorm = Math.max(pgNorm, Math.abs(step));
    }
    if (pgNorm <= PROJ_GRAD_TOL) break;

    const eps = Math.min(1e-6, pgNorm);
    const free: number[] = [];
    const bound: number[] = [];
    for (let j = 0; j < n; j++) {
      const atLower = x[j] <= p.lb[j] + eps && grad[j] > 0;
      const atUpper = x[j] >= p.ub[j] - eps && grad[j] < 0;
      if (atLower || atUpper) bound.push(j);
      else free.push(j);
    }

    const d = new Float64Array(n);
    if (free.length > 0) {
      const rhs = Float64Array.from(free, (j) => -grad[j]);
      const sol = choleskySolve(hess, n, free, rhs);
      if (sol) free.forEach((j, r) => (d[j] = sol[r]));
      else free.forEach((j) => (d[j] = -grad[j] / Math.max(hess[j * n + j], 1e-12)));
    }
    for (const j of bound) d[j] = -grad[j] / Math.max(hess[j * n + j], 1e-12);

    let alpha = 1;
    let accepted = false;
    for (let ls = 0; ls < 50; ls++) {
      const trial = new Float64Array(n);
      for (let j = 0; j < n; j++) trial[j] = x[j] + alpha * d[j];
      const xt = project(p, trial);
      const ft = augmentedValue(p, xt, st);
      let expected = 0;
      for (const j of free) expected += -alpha * grad[j] * d[j];
      for (const j of bound) expected += grad[j] * (x[j] - xt[j]);
      if (f - ft >= 1e-4 * expected - 1e-16 * Math.max(1, Math.abs(f))) {
        const moved = xt.some((v, j) => v !== x[j]);
        x = xt;
        accepted = moved;
        break;
      }
      alpha *= 0.5;
    }
    if (!accepted) {
      const next = projectedGradientStep(p, x, f, grad, hess, st);
      if (!next) break;
      x = next;
    }
    const fNew = augmentedValue(p, x, st, grad, hess);
    const decrease = f - fNew;
    f = fNew;
    if (decrease >= 0 && decrease <= 1e-16 * Math.max(1, Math.abs(f))) break;
  }
  return x;
}

function maxViolation(p: Problem, x: Float64Array): number {
  let v = 0;
  for (const c of p.cons) v = Math.max(v, dot(c.g, x) - c.h);
  return v;
}

/** Augmented Lagrangian (PHR) outer loop: converges to the constrained optimum of the convex problem. */
function augmentedLagrangian(p: Problem, x0: Float64Array): Float64Array {
  const st: AugmentedState = { lam: new Float64Array(p.cons.length), rho: RHO_START };
  let x = projectedNewton(p, x0, st);
  if (p.cons.length === 0) return x;
  let prevViol = Infinity;
  for (let outer = 0; outer < OUTER_MAX_ITER; outer++) {
    let dLam = 0;
    let lamMax = 0;
    for (let k = 0; k < p.cons.length; k++) {
      const r = dot(p.cons[k].g, x) - p.cons[k].h;
      const next = Math.max(0, st.lam[k] + st.rho * r);
      dLam = Math.max(dLam, Math.abs(next - st.lam[k]));
      st.lam[k] = next;
      lamMax = Math.max(lamMax, next);
    }
    const viol = maxViolation(p, x);
    if (viol <= CONSTRAINT_TOL && dLam <= 1e-9 * (1 + lamMax)) break;
    if (viol > 0.25 * prevViol) st.rho = Math.min(st.rho * 10, RHO_MAX);
    prevViol = viol;
    x = projectedNewton(p, x, st);
  }
  return x;
}

function ecAt(p: Problem, x: ArrayLike<number>): number {
  return p.ecEstimate!(achievedMap(p.groups, matVec(p, x)));
}

/** Continuous optimum; EC ceiling handled by successive linearisation (EC grows sublinearly). */
function solveContinuous(p: Problem, x0: Float64Array = new Float64Array(p.lb)): Float64Array {
  let x = augmentedLagrangian(p, x0);
  if (p.maxEc == null || !p.ecEstimate) return x;
  for (let pass = 0; pass < EC_LINEARIZATION_PASSES; pass++) {
    const ec0 = ecAt(p, x);
    if (ec0 <= p.maxEc + 1e-4) break;
    const grad = new Float64Array(p.n);
    for (let j = 0; j < p.n; j++) {
      const h = 1e-4 * Math.max(1, x[j]);
      const xp = Float64Array.from(x);
      xp[j] += h;
      grad[j] = (ecAt(p, xp) - ec0) / h;
    }
    const c = normalizedConstraint(grad, p.maxEc - ec0 + dot(grad, x), 'ec');
    if (!c) break;
    p.cons.push(c);
    x = augmentedLagrangian(p, x);
  }
  return x;
}

interface GridScore {
  score: number;
  feasible: boolean;
}

/** Grid score: feasible points always beat infeasible ones; infeasible ranked by violation. */
function gridScore(p: Problem, x: number[], ach: Float64Array): GridScore {
  matVec(p, x, ach);
  let violation = 0;
  for (let j = 0; j < p.n; j++) {
    if (x[j] < p.lb[j] - 1e-9) violation += p.lb[j] - x[j];
    if (x[j] > p.ub[j] + 1e-9) violation += x[j] - p.ub[j];
  }
  for (const c of p.cons) {
    if (c.kind === 'ec') continue;
    const r = dot(c.g, x) - c.h;
    if (r > 1e-9) violation += r;
  }
  if (p.maxEc != null && p.ecEstimate) {
    const ec = p.ecEstimate(achievedMap(p.groups, ach));
    if (ec > p.maxEc + 1e-6) violation += ec - p.maxEc;
  }
  if (violation > 0) return { score: INFEASIBLE_SCORE + violation, feasible: false };
  let used = 0;
  let cost = 0;
  for (let j = 0; j < p.n; j++) {
    if (x[j] > 0) used++;
    if (p.cost) cost += p.cost[j] * x[j];
  }
  return { score: rowObjective(p, ach) + used * 1e-9 + cost * 1e-10, feasible: true };
}

function clampToBounds(p: Problem, j: number, v: number): number {
  const r = roundDose(v);
  return Math.min(p.ub[j], Math.max(p.lb[j], r));
}

/** Snap the continuous optimum to the 0.001 dose grid without leaving the feasible set. */
function gridPolish(p: Problem, xc: Float64Array): number[] {
  const { n } = p;
  const ach = new Float64Array(p.m);
  const choices = Array.from({ length: n }, (_, j) => {
    const raw = Math.min(p.ub[j], Math.max(p.lb[j], xc[j]));
    const lo = clampToBounds(p, j, Math.floor(raw / DOSE_STEP) * DOSE_STEP);
    const hi = clampToBounds(p, j, Math.ceil(raw / DOSE_STEP) * DOSE_STEP);
    return lo === hi ? [lo] : [lo, hi];
  });
  let best = choices.map((c, j) => c.reduce((a, b) => (Math.abs(a - xc[j]) <= Math.abs(b - xc[j]) ? a : b)));
  let bestScore = gridScore(p, best, ach).score;

  if (n <= POLISH_ENUMERATE_MAX_N) {
    const trial = best.slice();
    const walk = (idx: number) => {
      if (idx === n) {
        const s = gridScore(p, trial, ach).score;
        if (s < bestScore) {
          bestScore = s;
          best = trial.slice();
        }
        return;
      }
      for (const c of choices[idx]) {
        trial[idx] = c;
        walk(idx + 1);
      }
    };
    walk(0);
  }

  let evals = 0;
  const consider = (trial: number[]): boolean => {
    evals++;
    const s = gridScore(p, trial, ach).score;
    if (s < bestScore) {
      bestScore = s;
      best = trial;
      return true;
    }
    return false;
  };

  let improved = true;
  while (improved && evals < POLISH_MOVE_EVALS) {
    improved = false;
    for (let j = 0; j < n; j++) {
      for (const step of POLISH_MOVE_STEPS) {
        for (const dir of [-1, 1]) {
          const v = clampToBounds(p, j, best[j] + dir * step * DOSE_STEP);
          if (v === best[j]) continue;
          const trial = best.slice();
          trial[j] = v;
          if (consider(trial)) improved = true;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (const di of [-1, 1]) {
          for (const dj of [-1, 1]) {
            const vi = clampToBounds(p, i, best[i] + di * DOSE_STEP);
            const vj = clampToBounds(p, j, best[j] + dj * DOSE_STEP);
            if (vi === best[i] && vj === best[j]) continue;
            const trial = best.slice();
            trial[i] = vi;
            trial[j] = vj;
            if (consider(trial)) improved = true;
          }
        }
      }
    }
  }

  if (n <= POLISH_PAIR_MAX_N) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const anchor = best.slice();
        for (let di = -POLISH_PAIR_RADIUS; di <= POLISH_PAIR_RADIUS; di++) {
          for (let dj = -POLISH_PAIR_RADIUS; dj <= POLISH_PAIR_RADIUS; dj++) {
            if (di === 0 && dj === 0) continue;
            const trial = anchor.slice();
            trial[i] = clampToBounds(p, i, anchor[i] + di * DOSE_STEP);
            trial[j] = clampToBounds(p, j, anchor[j] + dj * DOSE_STEP);
            consider(trial);
          }
        }
      }
    }
  }
  return best;
}

/**
 * A small dose sitting on an active cap can need a coordinated multi-step move of other doses after
 * rounding (e.g. 0.0088 → 0.009 on a micro mix forces a P/K carrier down 8 steps). Local grid search
 * misses that, so each such dose is also pinned to its lower and upper grid node with the rest re-solved.
 */
function roundToGrid(p: Problem, xc: Float64Array): number[] {
  const ach = new Float64Array(p.m);
  let best = gridPolish(p, xc);
  let bestScore = gridScore(p, best, ach).score;
  const continuous = rowObjective(p, matVec(p, xc));
  if (bestScore - continuous <= ROUNDING_GAP_TOL * Math.max(1, continuous)) return best;
  const sensitive = Array.from(xc, (v, j) => ({ v, j }))
    .filter(({ v, j }) => v > p.lb[j] + 1e-9 && v < p.ub[j] - 1e-9 && v <= ROUNDING_SENSITIVE_DOSE)
    .filter(({ v }) => Math.abs(v / DOSE_STEP - Math.round(v / DOSE_STEP)) > 1e-6)
    .sort((a, b) => a.v - b.v || a.j - b.j)
    .slice(0, ROUNDING_SENSITIVE_MAX);
  for (const { v, j } of sensitive) {
    for (const node of [Math.floor(v / DOSE_STEP), Math.ceil(v / DOSE_STEP)]) {
      const pin = clampToBounds(p, j, node * DOSE_STEP);
      const lb = Float64Array.from(p.lb);
      const ub = Float64Array.from(p.ub);
      lb[j] = pin;
      ub[j] = pin;
      const pinned: Problem = { ...p, lb, ub, cons: [...p.cons] };
      const cand = gridPolish(pinned, solveContinuous(pinned, project(pinned, xc)));
      const score = gridScore(p, cand, ach).score;
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }
  }
  return best;
}

function doseBoundsForProblem(
  workFerts: FertilizerSpec[],
  pairs: ManufacturerAbPair[],
  options?: SolveForwardOptions,
): Array<[number, number]> {
  const bounds = workFerts.map(
    (f) => [0, f.maxDosePerL ?? MAX_DOSE_DEFAULT] as [number, number],
  );
  const floors = options?.minDosePerLById;
  if (floors) {
    workFerts.forEach((f, j) => {
      const floor = floors[f.id];
      if (floor != null && floor > 0) bounds[j][0] = Math.min(bounds[j][1], floor);
    });
  }
  const fix = options?.wandAbPairFixPartADoseGPerL;
  const floor = options?.wandAbPairMinDoseGPerL;
  if (pairs.length === 0) return bounds;
  const idToIdx = new Map(workFerts.map((f, i) => [f.id, i]));
  for (const pair of pairs) {
    const j = idToIdx.get(pair.partA.id);
    if (j == null) continue;
    if (fix != null && fix > 0) {
      bounds[j] = [fix, fix];
    } else if (floor != null && floor > 0) {
      bounds[j][0] = Math.max(bounds[j][0], Math.min(bounds[j][1], floor));
    }
  }
  return bounds;
}

export function solveCapAware(
  fertilizers: FertilizerSpec[],
  target: Record<string, number>,
  model: ChemistryModel,
  options?: SolveForwardOptions,
): { x: number[]; groups: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const linkAb = shouldLinkManufacturerAbPairs(model, options);
  const pairs = linkAb ? detectManufacturerAbPairs(fertilizers) : [];
  const { forOptimize } = linkAb ? planManufacturerAbLinkage(fertilizers) : { forOptimize: fertilizers };
  const workFerts = pairs.length > 0 ? forOptimize : fertilizers;
  const groups = collectGroups(workFerts, target, model);
  let A = buildChemistryMatrix(workFerts, groups, model);
  if (pairs.length > 0) {
    A = augmentMatrixWithLinkedPartB(A, workFerts, pairs, groups, model);
  }
  const bounds = doseBoundsForProblem(workFerts, pairs, options);
  const problem = buildProblem(workFerts, groups, A, target, model, pairs, bounds, options);

  const xc = solveContinuous(problem);
  const x = roundToGrid(problem, xc);
  const ach = new Float64Array(problem.m);
  const { feasible } = gridScore(problem, x, ach);
  const achieved = achievedMap(groups, ach);

  const nh4 = dot(problem.nh4Worst, x);
  const nTot = dot(problem.nTotal, x);
  if (dot(problem.nUnknown, x) > 0) warnings.push('nitrogen_form_unknown');
  if (options?.maxAmmoniumShare != null && nTot > 0 && nh4 / nTot > options.maxAmmoniumShare + 1e-6) {
    warnings.push('nh4_share_worst_case');
  }

  if (options?.minMatchPct != null) {
    const targeted = Object.keys(target).filter((g) => (target[g] ?? 0) > 0);
    const scores = targeted.map((g) => {
      const t = target[g]!;
      const v = achieved[g] ?? 0;
      return Math.max(0, 100 - Math.abs((v / t) * 100 - 100));
    });
    const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    if (avg < options.minMatchPct) warnings.push('below_min_match_threshold');
  }

  if (!feasible) warnings.push('infeasible_best_effort');

  if ((options?.microOverdoseCap ?? 'soft') === 'soft') {
    const over = microGroupsOverCap(target, achieved, options?.overdosePctByGroup);
    if (over.length > 0) warnings.push(`micro_over_cap:${over.join(',')}`);
  }

  return { x: x.map(roundDose), groups, warnings };
}
