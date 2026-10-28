import type { ChemistryModel } from './chemistry-matrix';
import { fertilizerMacroContributionVector, isMicroCarrier } from './fertilizer-equivalence';
import { DEFAULT_OVERDOSE_PCT } from './objective';
import type { FertilizerSpec } from './types';
import { wandMacroTargetsFromNet } from './wand-alternative-dedupe';

/** Macros a recipe must reach before it counts as assembled. Sulfur is not in this set. */
export const ASSEMBLE_MACROS = ['N', 'P', 'K', 'Ca', 'Mg'] as const;

/** Assembled when achieved ppm is at least this share of the profile target. */
export const ASSEMBLE_FLOOR_RATIO = 0.9;

const BLOCKER_ORDER = ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

export type AssembleWarning =
  | { kind: 'missing'; element: string }
  | { kind: 'short'; element: string; pct: string }
  | { kind: 'blocked'; element: string; pct: string; blocker: string };

function foldedMacros(
  target: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
): { target: Record<string, number>; achieved: Record<string, number> } {
  return {
    target: wandMacroTargetsFromNet(target, model),
    achieved: wandMacroTargetsFromNet(achieved, model),
  };
}

/** Overdose cap in percent, matching the solver (`overdosePctByGroup`). */
export function assembleOverdosePct(
  element: string,
  overdosePct: Record<string, number> | undefined,
): number {
  if (element === 'N') {
    const named = overdosePct?.N ?? overdosePct?.N_NO3 ?? overdosePct?.N_NH4 ?? overdosePct?.N_UREA;
    if (named != null) return named;
  } else if (overdosePct?.[element] != null) {
    return overdosePct[element]!;
  }
  return DEFAULT_OVERDOSE_PCT;
}

export function solutionMeetsAssembleFloor(
  target: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
): boolean {
  const folded = foldedMacros(target, achieved, model);
  for (const element of ASSEMBLE_MACROS) {
    const goal = folded.target[element] ?? 0;
    if (goal <= 0) continue;
    if ((folded.achieved[element] ?? 0) < goal * ASSEMBLE_FLOOR_RATIO - 1e-6) return false;
  }
  return true;
}

export function solutionPassesAssembleOvershoot(
  target: Record<string, number>,
  achieved: Record<string, number>,
  model: ChemistryModel,
  overdosePct?: Record<string, number>,
): boolean {
  const folded = foldedMacros(target, achieved, model);
  for (const element of ASSEMBLE_MACROS) {
    const goal = folded.target[element] ?? 0;
    if (goal <= 0) continue;
    const cap = assembleOverdosePct(element, overdosePct);
    const ceiling = goal * (1 + cap / 100);
    if ((folded.achieved[element] ?? 0) > ceiling + 1e-6) return false;
  }
  return true;
}

/**
 * Blocker element if raising this salt enough to reach the floor would cross that element's
 * overdose ceiling. Null when the salt can close the gap inside every co-element ceiling.
 */
function gapBlocker(
  vec: Record<string, number>,
  element: string,
  gapPpm: number,
  folded: { target: Record<string, number>; achieved: Record<string, number> },
  overdosePct: Record<string, number> | undefined,
): string | null {
  const perG = vec[element] ?? 0;
  if (perG <= 0 || gapPpm <= 1e-6) return null;
  const extraDose = gapPpm / perG;
  for (const other of BLOCKER_ORDER) {
    if (other === element) continue;
    const otherPerG = vec[other] ?? 0;
    if (otherPerG <= 0.5) continue;
    const goal = folded.target[other] ?? 0;
    if (goal <= 0) continue;
    const ceiling = goal * (1 + assembleOverdosePct(other, overdosePct) / 100);
    if ((folded.achieved[other] ?? 0) + extraDose * otherPerG > ceiling + 1e-4) return other;
  }
  return null;
}

export function assembleShortfallWarnings(
  target: Record<string, number>,
  achieved: Record<string, number>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel,
  overdosePct?: Record<string, number>,
): string[] {
  const folded = foldedMacros(target, achieved, model);
  const warnings: string[] = [];
  for (const element of ASSEMBLE_MACROS) {
    const goal = folded.target[element] ?? 0;
    if (goal <= 0) continue;
    const got = folded.achieved[element] ?? 0;
    if (got >= goal * ASSEMBLE_FLOOR_RATIO - 1e-6) continue;
    const pct = String(Math.max(0, Math.round((got / goal) * 100)));
    const suppliers = fertilizers.filter((fert) => {
      if (isMicroCarrier(fert, model)) return false;
      const vec = fertilizerMacroContributionVector(fert, model);
      return (vec[element] ?? 0) > 0.5;
    });
    if (suppliers.length === 0) {
      warnings.push(`assemble_missing:${element}`);
      continue;
    }
    const gap = goal * ASSEMBLE_FLOOR_RATIO - got;
    let free = false;
    let blocker = '';
    let blockerContrib = -1;
    for (const fert of suppliers) {
      const vec = fertilizerMacroContributionVector(fert, model);
      const hit = gapBlocker(vec, element, gap, folded, overdosePct);
      if (!hit) {
        free = true;
        break;
      }
      const contrib = vec[element] ?? 0;
      if (contrib > blockerContrib) {
        blockerContrib = contrib;
        blocker = hit;
      }
    }
    warnings.push(free || !blocker ? `assemble_short:${element}:${pct}` : `assemble_blocked:${element}:${pct}:${blocker}`);
  }
  return warnings;
}

export function parseAssembleWarning(code: string): AssembleWarning | null {
  const [kind, element, pct, blocker] = code.split(':');
  if (!element) return null;
  if (kind === 'assemble_missing') return { kind: 'missing', element };
  if (kind === 'assemble_short' && pct) return { kind: 'short', element, pct };
  if (kind === 'assemble_blocked' && pct && blocker) return { kind: 'blocked', element, pct, blocker };
  return null;
}
