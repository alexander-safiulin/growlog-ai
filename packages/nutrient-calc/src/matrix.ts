import type { ElementKey, FertilizerSpec, TargetPpm } from './types';

/** mg/L contributed per 1 g/L or 1 ml/L dose: dose × (pct/100) × 1000 */
export function contributionPerUnitDose(pctElemental: number): number {
  return (pctElemental / 100) * 1000;
}

export function buildContributionMatrix(
  fertilizers: FertilizerSpec[],
  elements: ElementKey[],
): number[][] {
  const rows = elements.length;
  const cols = fertilizers.length;
  const A: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let j = 0; j < cols; j++) {
    const fert = fertilizers[j];
    for (let i = 0; i < rows; i++) {
      const el = elements[i];
      const pct = fert.elementalPct[el] ?? 0;
      A[i][j] = contributionPerUnitDose(pct);
    }
  }
  return A;
}

export function netTargetAfterWater(target: TargetPpm, water?: TargetPpm): TargetPpm {
  const keys = new Set<ElementKey>([
    ...Object.keys(target),
    ...Object.keys(water ?? {}),
  ] as ElementKey[]);

  const out: TargetPpm = {};
  for (const key of keys) {
    const t = target[key] ?? 0;
    const w = water?.[key] ?? 0;
    out[key] = Math.max(0, t - w);
  }
  return out;
}

export function multiplyMatrixVector(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < x.length; j++) {
      sum += A[i][j] * x[j];
    }
    out[i] = sum;
  }
  return out;
}

export function vectorToTargetPpm(elements: ElementKey[], values: number[]): TargetPpm {
  const out: TargetPpm = {};
  for (let i = 0; i < elements.length; i++) {
    if (values[i] !== 0) out[elements[i]] = values[i];
  }
  return out;
}

export function targetToVector(elements: ElementKey[], target: TargetPpm): number[] {
  return elements.map((el) => target[el] ?? 0);
}

export function stableSortFertilizers(fertilizers: FertilizerSpec[]): FertilizerSpec[] {
  return [...fertilizers].sort((a, b) => {
    const ka = `${a.brand ?? ''}\0${a.name}\0${a.id}`;
    const kb = `${b.brand ?? ''}\0${b.name}\0${b.id}`;
    return ka.localeCompare(kb);
  });
}
