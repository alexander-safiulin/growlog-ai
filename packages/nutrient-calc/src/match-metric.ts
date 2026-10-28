import { achievedForObjective } from './nitrogen-target';
import { computeObjective, DEFAULT_ELEMENT_PRIORITY, MACRO_GROUPS } from './objective';

export function elementDeviationPct(target: number, achieved: number): number {
  if (target <= 0) return 0;
  return (achieved / target) * 100 - 100;
}

export function elementMatchScorePct(target: number, achieved: number): number {
  if (target <= 0) return 0;
  const dev = elementDeviationPct(target, achieved);
  return Math.max(0, 100 - Math.abs(dev));
}

export function growlogMatchPct(
  target: Record<string, number>,
  achieved: Record<string, number>,
  groups?: string[],
): number {
  const keys =
    groups ?? Object.keys(target).filter((k) => (target[k] ?? 0) > 0);
  if (keys.length === 0) return 0;
  let sum = 0;
  for (const g of keys) {
    const t = target[g] ?? 0;
    if (t <= 0) continue;
    sum += elementMatchScorePct(t, achieved[g] ?? 0);
  }
  return sum / keys.length;
}

export function growlogMacroMatchPct(
  target: Record<string, number>,
  achieved: Record<string, number>,
): number {
  const macros = MACRO_GROUPS.filter((g) => (target[g] ?? 0) > 0);
  return growlogMatchPct(target, achievedForObjective(target, achieved), macros as unknown as string[]);
}

/** Priority-weighted RMS relative macro deviation (macros with target > 0). */
export function weightedMacroDeviation(
  target: Record<string, number>,
  achieved: Record<string, number>,
): number {
  const macros = MACRO_GROUPS.filter((g) => (target[g] ?? 0) > 0);
  if (macros.length === 0) return 0;
  const scored = achievedForObjective(target, achieved);
  let wSum = 0;
  let sum = 0;
  for (const g of macros) {
    const t = target[g]!;
    const w = DEFAULT_ELEMENT_PRIORITY[g] ?? 1;
    const rel = ((scored[g] ?? 0) - t) / t;
    sum += w * rel * rel;
    wSum += w;
  }
  return Math.sqrt(sum / wSum);
}

export function withinOverdoseCaps(
  target: Record<string, number>,
  achieved: Record<string, number>,
  overdosePct: Record<string, number>,
): boolean {
  const scored = achievedForObjective(target, achieved);
  for (const [g, t] of Object.entries(target)) {
    if (t <= 0) continue;
    const cap = overdosePct[g] ?? 50;
    const max = t * (1 + cap / 100);
    if ((scored[g] ?? 0) > max + 1e-6) return false;
  }
  return true;
}

export function hydroodoObjective(
  groups: string[],
  target: Record<string, number>,
  achieved: Record<string, number>,
): number {
  return computeObjective(groups, target, achieved);
}
