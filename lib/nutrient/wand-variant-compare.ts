import type { Deviation, ElementKey, SolveSolution } from '@growlog/nutrient-calc';
import { nitrogenBreakdown } from '@/lib/nutrient/nitrogen-breakdown';
import {
  NUTRIENT_MACRO_KEYS,
  NUTRIENT_OPTIONAL_ION_KEYS,
  NUTRIENT_TRACE_MICRO_KEYS,
} from '@/lib/nutrient/solver-deviation-keys';

export type CompareSeverity = 'ok' | 'amber' | 'red';
export type CompareDirection = 'surplus' | 'deficit' | 'neutral';

/** Absolute deviation % below this value is neutral (green). */
export const WAND_COMPARE_NEUTRAL_MAX_ABS_PCT = 10;
/** Absolute deviation % from neutral max up to (but not including) this value is amber. */
export const WAND_COMPARE_AMBER_MAX_ABS_PCT = 20;

export function classifyDeviation(deltaPct: number): {
  severity: CompareSeverity;
  direction: CompareDirection;
} {
  const abs = Math.abs(deltaPct);
  const severity: CompareSeverity =
    abs < WAND_COMPARE_NEUTRAL_MAX_ABS_PCT
      ? 'ok'
      : abs < WAND_COMPARE_AMBER_MAX_ABS_PCT
        ? 'amber'
        : 'red';
  const direction: CompareDirection =
    deltaPct > 0.5 ? 'surplus' : deltaPct < -0.5 ? 'deficit' : 'neutral';
  return { severity, direction };
}

export type WandCompareCell =
  | {
      kind: 'deviation';
      deltaPct: number;
      achievedPpm: number;
      targetPpm: number;
      severity: CompareSeverity;
      direction: CompareDirection;
    }
  | { kind: 'achieved'; achievedPpm: number }
  | { kind: 'match'; matchPct: number }
  | {
      kind: 'ec';
      ecMsCm: number;
      targetEcMsCm?: number;
      deltaPct?: number;
      severity?: CompareSeverity;
      direction?: CompareDirection;
    };

export type WandCompareRow = {
  id: string;
  elementKey?: ElementKey | 'N_total' | 'ec' | 'match';
  cells: WandCompareCell[];
};

function deviationFor(
  solution: SolveSolution,
  element: ElementKey,
): Deviation | undefined {
  return solution.deviations.find((d) => d.element === element);
}

function sumN(target: Record<string, number>, achieved: Record<string, number>) {
  const row = nitrogenBreakdown(target, achieved);
  return { targetPpm: row.targetPpm, achievedPpm: row.achievedPpm };
}

function cellFromDeviation(targetPpm: number, achievedPpm: number): WandCompareCell {
  if (targetPpm <= 0) {
    return { kind: 'achieved', achievedPpm };
  }
  const deltaPpm = achievedPpm - targetPpm;
  const deltaPct = (deltaPpm / targetPpm) * 100;
  const { severity, direction } = classifyDeviation(deltaPct);
  return {
    kind: 'deviation',
    deltaPct,
    achievedPpm,
    targetPpm,
    severity,
    direction,
  };
}

function cellFromDeviationRow(d: Deviation): WandCompareCell {
  return cellFromDeviation(d.targetPpm, d.achievedPpm);
}

export function buildWandCompareRowIds(params: {
  target: Record<string, number>;
  model: 'canonical' | 'hydroodo_legacy';
  showMicro: boolean;
  showOptionalIons?: boolean;
  solutions: SolveSolution[];
}): string[] {
  const { target, model, showMicro, showOptionalIons = false, solutions } = params;
  const ids: string[] = [];

  if (model === 'hydroodo_legacy') {
    ids.push('N');
  } else {
    ids.push('N_total');
    for (const key of ['N_NO3', 'N_NH4', 'N_UREA', 'N_UNKNOWN'] as ElementKey[]) {
      const hasTarget = (target[key] ?? 0) > 0;
      const hasAchieved = solutions.some(
        (s) => ((s.achievedPpm as Record<string, number>)[key] ?? 0) > 0,
      );
      if (hasTarget || hasAchieved) ids.push(key);
    }
  }

  const macroRest = model === 'hydroodo_legacy'
    ? (['P', 'K', 'Ca', 'Mg', 'S'] as ElementKey[])
    : NUTRIENT_MACRO_KEYS.filter((k) => k !== 'N_NO3' && k !== 'N_NH4');

  for (const key of macroRest) {
    ids.push(key);
  }

  if (showMicro) {
    for (const key of NUTRIENT_TRACE_MICRO_KEYS) {
      const hasTarget = (target[key] ?? 0) > 0;
      const hasAchieved = solutions.some(
        (s) => ((s.achievedPpm as Record<string, number>)[key] ?? 0) > 0,
      );
      if (hasTarget || hasAchieved) ids.push(key);
    }
  }

  if (showOptionalIons) {
    for (const key of NUTRIENT_OPTIONAL_ION_KEYS) {
      const hasTarget = (target[key] ?? 0) > 0;
      const hasAchieved = solutions.some(
        (s) => ((s.achievedPpm as Record<string, number>)[key] ?? 0) > 0,
      );
      if (hasTarget || hasAchieved) ids.push(key);
    }
  }

  ids.push('ec', 'match');
  return ids;
}

export function buildWandVariantCompareRows(params: {
  solutions: SolveSolution[];
  target: Record<string, number>;
  model: 'canonical' | 'hydroodo_legacy';
  showMicro: boolean;
  showOptionalIons?: boolean;
  ecTargetMsCm?: number | null;
}): WandCompareRow[] {
  const { solutions, target, model, showMicro, showOptionalIons, ecTargetMsCm } = params;
  const rowIds = buildWandCompareRowIds({
    target,
    model,
    showMicro,
    showOptionalIons,
    solutions,
  });

  return rowIds.map((rowId) => {
    const cells: WandCompareCell[] = solutions.map((solution) => {
      const achieved = solution.achievedPpm as Record<string, number>;

      if (rowId === 'match') {
        return { kind: 'match', matchPct: solution.matchScore * 100 };
      }

      if (rowId === 'ec') {
        const ecMsCm = solution.ecEstimateMsCm ?? 0;
        if (ecTargetMsCm != null && ecTargetMsCm > 0) {
          const deltaPct = ((ecMsCm - ecTargetMsCm) / ecTargetMsCm) * 100;
          const { severity, direction } = classifyDeviation(deltaPct);
          return {
            kind: 'ec',
            ecMsCm,
            targetEcMsCm: ecTargetMsCm,
            deltaPct,
            severity,
            direction,
          };
        }
        return { kind: 'ec', ecMsCm };
      }

      if (rowId === 'N_total') {
        const { targetPpm, achievedPpm } = sumN(target, achieved);
        return cellFromDeviation(targetPpm, achievedPpm);
      }

      const element = rowId as ElementKey;
      const d = deviationFor(solution, element);
      if (d) return cellFromDeviationRow(d);

      const targetPpm = target[element] ?? 0;
      const achievedPpm = achieved[element] ?? 0;
      return cellFromDeviation(targetPpm, achievedPpm);
    });

    return {
      id: rowId,
      elementKey: rowId as WandCompareRow['elementKey'],
      cells,
    };
  });
}
