/**
 * Lawson–Hanson NNLS with box constraints [lower, upper].
 */

export interface BoundedNnlsOptions {
  maxIter?: number;
  tol?: number;
}

export function boundedNnls(
  A: number[][],
  b: number[],
  weights: number[],
  lower: number[],
  upper: number[],
  options?: BoundedNnlsOptions,
): { x: number[]; residualNormSq: number } {
  const sqrtW = weights.map((w) => Math.sqrt(Math.max(w, 0)));
  const Aw = A.map((row, i) => row.map((v) => v * sqrtW[i]));
  const bw = b.map((bi, i) => bi * sqrtW[i]);
  const cappedUpper = upper.map((u) => (Number.isFinite(u) ? u : 1e6));

  const x = nnlsBox(Aw, bw, lower, cappedUpper, options?.tol ?? 1e-10, options?.maxIter ?? 5000);

  const residual = subtract(matVec(Aw, x), bw);
  let residualNormSq = 0;
  for (const r of residual) residualNormSq += r * r;
  return { x, residualNormSq };
}

function nnlsBox(
  A: number[][],
  b: number[],
  lower: number[],
  upper: number[],
  tol: number,
  maxIter: number,
): number[] {
  const n = A[0]?.length ?? 0;
  const x = lower.slice();
  const P: number[] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    const Ax = matVec(A, x);
    const w = matVecT(A, subtract(b, Ax));

    let enter = -1;
    let bestW = tol;
    for (let j = 0; j < n; j++) {
      if (x[j] >= upper[j] - tol) continue;
      if (w[j] > bestW) {
        bestW = w[j];
        enter = j;
      }
    }

    if (enter < 0) break;

    if (!P.includes(enter)) P.push(enter);

    while (true) {
      const z = solvePassive(A, b, P, lower, upper, n);
      let alpha = 1;
      for (const j of P) {
        if (z[j] <= lower[j] + tol) {
          const denom = x[j] - z[j];
          if (denom > tol) {
            alpha = Math.min(alpha, (x[j] - lower[j]) / denom);
          }
        }
      }

      for (let j = 0; j < n; j++) {
        x[j] = x[j] + alpha * (z[j] - x[j]);
        x[j] = Math.min(upper[j], Math.max(lower[j], x[j]));
      }

      const remove: number[] = [];
      for (const j of P) {
        if (x[j] <= lower[j] + tol) {
          x[j] = lower[j];
          remove.push(j);
        }
      }
      for (const j of remove) {
        const idx = P.indexOf(j);
        if (idx >= 0) P.splice(idx, 1);
      }

      if (remove.length === 0) break;
      if (P.length === 0) break;
    }
  }

  return x.map((v, j) => Math.min(upper[j], Math.max(lower[j], v)));
}

function solvePassive(
  A: number[][],
  b: number[],
  P: number[],
  lower: number[],
  upper: number[],
  n: number,
): number[] {
  const z = lower.slice();
  if (P.length === 0) return z;

  const cols = P.map((j) => A.map((row) => row[j]));
  const xP = solveLeastSquares(cols, b);

  for (let k = 0; k < P.length; k++) {
    const j = P[k];
    z[j] = Math.min(upper[j], Math.max(lower[j], xP[k]));
  }
  return z;
}

function solveLeastSquares(cols: number[][], b: number[]): number[] {
  const n = cols.length;
  const m = b.length;
  const ata: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const atb = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += cols[i][k] * cols[j][k];
      ata[i][j] = s;
    }
    let s = 0;
    for (let k = 0; k < m; k++) s += cols[i][k] * b[k];
    atb[i] = s;
  }

  return choleskySolve(ata, atb);
}

function choleskySolve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = sum > 0 ? Math.sqrt(sum) : 0;
      } else {
        L[i][j] = L[j][j] !== 0 ? sum / L[j][j] : 0;
      }
    }
  }

  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
    y[i] = L[i][i] !== 0 ? sum / L[i][i] : 0;
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
    x[i] = L[i][i] !== 0 ? sum / L[i][i] : 0;
  }
  return x;
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

function matVecT(A: number[][], y: number[]): number[] {
  const n = A[0]?.length ?? 0;
  const out = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < y.length; i++) out[j] += A[i][j] * y[i];
  }
  return out;
}

function subtract(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}
