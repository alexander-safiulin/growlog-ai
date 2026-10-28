import { computeDeviations, type ElementKey, type TargetPpm } from '@growlog/nutrient-calc';
import { showNutrientElementRow } from './format-nutrient-amount';
import { nitrogenBreakdown, nitrogenRowVisible } from './nitrogen-breakdown';
import { NUTRIENT_OPTIONAL_ION_KEYS, NUTRIENT_TRACE_MICRO_KEYS } from './solver-deviation-keys';

const MACRO_REST: ElementKey[] = ['P', 'K', 'Ca', 'Mg', 'S'];

export type SolutionElementTone = 'ok' | 'under' | 'over' | 'neutral';

export type SolutionElementTile = {
  element: string;
  group: 'macro' | 'micro';
  achievedPpm: number;
  targetPpm: number;
  deltaPct: number | null;
  withinTolerance: boolean;
  tone: SolutionElementTone;
};

function toneOf(deltaPct: number | null, withinTolerance: boolean): SolutionElementTone {
  if (deltaPct == null) return 'neutral';
  if (withinTolerance) return 'ok';
  return deltaPct < 0 ? 'under' : 'over';
}

function tile(
  element: string,
  group: SolutionElementTile['group'],
  targetPpm: number,
  achievedPpm: number,
  deltaPct: number | null,
  withinTolerance: boolean,
): SolutionElementTile {
  return {
    element,
    group,
    targetPpm,
    achievedPpm,
    deltaPct,
    withinTolerance,
    tone: toneOf(deltaPct, withinTolerance),
  };
}

export function formatSolutionElementDelta(deltaPct: number): string {
  const text = deltaPct.toFixed(1);
  return `${deltaPct > 0 ? '+' : ''}${text}%`;
}

/**
 * Elements actually in the mixed solution, macro then micro.
 * Nitrogen is one tile (the same sum as the result table). Si, Cl and Na stay out
 * until the optional-ion switch is on.
 */
export function solutionElementPanorama(params: {
  target: Record<string, number>;
  achieved: Record<string, number>;
  showOptionalIons?: boolean;
}): SolutionElementTile[] {
  const { target, achieved, showOptionalIons = false } = params;
  const ppmTarget = target as TargetPpm;
  const ppmAchieved = achieved as TargetPpm;
  const tiles: SolutionElementTile[] = [];

  const nitrogen = nitrogenBreakdown(target, achieved);
  if (nitrogenRowVisible(nitrogen) && showNutrientElementRow(0, nitrogen.achievedPpm)) {
    tiles.push(
      tile('N', 'macro', nitrogen.targetPpm, nitrogen.achievedPpm, nitrogen.deltaPct, nitrogen.withinTolerance),
    );
  }

  const rest: Array<{ element: ElementKey; group: SolutionElementTile['group'] }> = [
    ...MACRO_REST.map((element) => ({ element, group: 'macro' as const })),
    ...NUTRIENT_TRACE_MICRO_KEYS.map((element) => ({ element, group: 'micro' as const })),
    ...(showOptionalIons
      ? NUTRIENT_OPTIONAL_ION_KEYS.map((element) => ({ element, group: 'micro' as const }))
      : []),
  ];

  for (const { element, group } of rest) {
    const targetPpm = target[element] ?? 0;
    const achievedPpm = achieved[element] ?? 0;
    if (targetPpm > 0) {
      const row = computeDeviations([element], ppmTarget, ppmAchieved)[0];
      if (!row || !showNutrientElementRow(0, row.achievedPpm)) continue;
      tiles.push(tile(element, group, row.targetPpm, row.achievedPpm, row.deltaPct, row.withinTolerance));
      continue;
    }
    if (!showNutrientElementRow(0, achievedPpm)) continue;
    tiles.push(tile(element, group, 0, achievedPpm, null, true));
  }

  return tiles;
}
