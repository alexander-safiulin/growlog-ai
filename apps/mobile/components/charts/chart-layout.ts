export const CHART_PAD = { top: 8, right: 8, bottom: 22, left: 36 };

export function plotWidth(totalWidth: number): number {
  return Math.max(0, totalWidth - CHART_PAD.left - CHART_PAD.right);
}

export function plotHeight(totalHeight: number): number {
  return Math.max(0, totalHeight - CHART_PAD.top - CHART_PAD.bottom);
}

export function linearScale(
  value: number,
  domain: [number, number],
  range: [number, number],
): number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

export function niceYDomain(values: number[], band?: { min: number; max: number } | null): [number, number] {
  const all = [...values];
  if (band) {
    all.push(band.min, band.max);
  }
  if (!all.length) return [0, 1];
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

export function formatYTick(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return '';
  return v.toFixed(decimals).replace(/\.0$/, '');
}
