import { resolveOverdosePct, resolveUnderdosePct, type ElementKey } from '@growlog/nutrient-calc';
import { showNutrientElementRow } from './format-nutrient-amount';

const FORM_KEYS = ['N_NO3', 'N_NH4', 'N_UREA'] as const;

export type NitrogenFormKey = (typeof FORM_KEYS)[number] | 'N_UNKNOWN';

export type NitrogenAmount = {
  targetPpm: number;
  achievedPpm: number;
  deltaPct: number | null;
  withinTolerance: boolean;
};

export type NitrogenFormAmount = NitrogenAmount & { key: NitrogenFormKey };

export type NitrogenBreakdown = NitrogenAmount & {
  forms: NitrogenFormAmount[];
};

function ppm(map: Record<string, number>, key: string): number {
  const value = map[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function band(
  element: ElementKey,
  targetPpm: number,
  achievedPpm: number,
): Pick<NitrogenAmount, 'deltaPct' | 'withinTolerance'> {
  if (targetPpm <= 0) return { deltaPct: null, withinTolerance: true };
  const deltaPct = ((achievedPpm - targetPpm) / targetPpm) * 100;
  const over = resolveOverdosePct(element);
  const under = resolveUnderdosePct(element);
  const withinTolerance =
    achievedPpm >= targetPpm * (1 - under) - 1e-9 && achievedPpm <= targetPpm * (1 + over) + 1e-9;
  return { deltaPct, withinTolerance };
}

/**
 * Elemental nitrogen for the solution composition table.
 * Unspecified label nitrogen is stored as both `N` and `N_UNKNOWN` (the same mg).
 * Nitrate, ammonium and urea stay on their own keys. The total adds the forms once
 * plus the larger of `N` and `N_UNKNOWN`.
 */
export function nitrogenBreakdown(
  target: Record<string, number>,
  achieved: Record<string, number>,
): NitrogenBreakdown {
  const targetForms = {
    N_NO3: ppm(target, 'N_NO3'),
    N_NH4: ppm(target, 'N_NH4'),
    N_UREA: ppm(target, 'N_UREA'),
  };
  const achievedForms = {
    N_NO3: ppm(achieved, 'N_NO3'),
    N_NH4: ppm(achieved, 'N_NH4'),
    N_UREA: ppm(achieved, 'N_UREA'),
  };
  const targetUnspecified = Math.max(ppm(target, 'N'), ppm(target, 'N_UNKNOWN'));
  const achievedUnspecified = Math.max(ppm(achieved, 'N'), ppm(achieved, 'N_UNKNOWN'));
  const targetPpm = targetForms.N_NO3 + targetForms.N_NH4 + targetForms.N_UREA + targetUnspecified;
  const achievedPpm =
    achievedForms.N_NO3 + achievedForms.N_NH4 + achievedForms.N_UREA + achievedUnspecified;

  const forms: NitrogenFormAmount[] = [];
  for (const key of FORM_KEYS) {
    if (!showNutrientElementRow(targetForms[key], achievedForms[key])) continue;
    forms.push({
      key,
      targetPpm: targetForms[key],
      achievedPpm: achievedForms[key],
      ...band(key, targetForms[key], achievedForms[key]),
    });
  }

  const targetUnknown = ppm(target, 'N_UNKNOWN');
  const achievedUnknown = ppm(achieved, 'N_UNKNOWN');
  if (showNutrientElementRow(targetUnknown, achievedUnknown)) {
    forms.push({
      key: 'N_UNKNOWN',
      targetPpm: targetUnknown,
      achievedPpm: achievedUnknown,
      ...band('N_NO3', targetUnknown, achievedUnknown),
    });
  }

  return {
    targetPpm,
    achievedPpm,
    ...band('N_NO3', targetPpm, achievedPpm),
    forms,
  };
}

export function nitrogenRowVisible(row: NitrogenBreakdown): boolean {
  return showNutrientElementRow(row.targetPpm, row.achievedPpm);
}
