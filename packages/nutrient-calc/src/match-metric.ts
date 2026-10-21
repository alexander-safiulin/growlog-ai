import type { HydroodoGroup } from './hydroodo-model';
import { HYDROODO_MACRO_GROUPS } from './hydroodo-model';

/**
 * Growlog match metric (NOT Hydroodo «Раствор: %» — that formula is unknown).
 *
 * For each targeted element g with target T > 0:
 *   element_score(g) = max(0, 100 − |100 × (A_g − T) / T|)
 *
 * growlog_match_pct_macros = arithmetic mean of element_score over {N,P,K,Ca,Mg,S} ∩ targets
 * growlog_match_pct_all    = arithmetic mean over all targeted elements
 *
 * weighted_macro_deviation = sqrt(mean(w_g × ((A_g − T)/T)²)) with w_g = 1 for macros (documented for parity).
 */

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
    groups ??
    Object.keys(target).filter((k) => (target[k] ?? 0) > 0);
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
  const macros = HYDROODO_MACRO_GROUPS.filter((g) => (target[g] ?? 0) > 0);
  return growlogMatchPct(target, achieved, macros);
}

export function weightedMacroDeviation(
  target: Record<string, number>,
  achieved: Record<string, number>,
): number {
  const macros = HYDROODO_MACRO_GROUPS.filter((g) => (target[g] ?? 0) > 0);
  if (macros.length === 0) return 0;
  let sum = 0;
  for (const g of macros) {
    const t = target[g]!;
    const rel = ((achieved[g] ?? 0) - t) / t;
    sum += rel * rel;
  }
  return Math.sqrt(sum / macros.length);
}

export function withinOverdoseCaps(
  target: Record<string, number>,
  achieved: Record<string, number>,
  overdosePct: Record<string, number>,
): boolean {
  for (const [g, t] of Object.entries(target)) {
    if (t <= 0) continue;
    const cap = overdosePct[g] ?? 50;
    const max = t * (1 + cap / 100);
    if ((achieved[g] ?? 0) > max + 1e-6) return false;
  }
  return true;
}
