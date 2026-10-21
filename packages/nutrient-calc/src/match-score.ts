import type { Deviation, ElementKey, TargetPpm, ToleranceOptions } from './types';
import { resolveOverdosePct, resolveUnderdosePct, resolveWeight } from './tolerances';

export function computeDeviations(
  elements: ElementKey[],
  target: TargetPpm,
  achieved: TargetPpm,
  options?: ToleranceOptions,
): Deviation[] {
  const deviations: Deviation[] = [];

  for (const element of elements) {
    const targetPpm = target[element] ?? 0;
    if (targetPpm <= 0) continue;

    const achievedPpm = achieved[element] ?? 0;
    const deltaPpm = achievedPpm - targetPpm;
    const deltaPct = (deltaPpm / targetPpm) * 100;

    const over = resolveOverdosePct(element, options);
    const under = resolveUnderdosePct(element, options);
    const overdoseLimitPpm = targetPpm * (1 + over);
    const underdoseLimitPpm = targetPpm * (1 - under);

    const withinTolerance =
      achievedPpm >= underdoseLimitPpm && achievedPpm <= overdoseLimitPpm;

    deviations.push({
      element,
      targetPpm,
      achievedPpm,
      deltaPpm,
      deltaPct,
      withinTolerance,
      overdoseLimitPpm,
      underdoseLimitPpm,
    });
  }

  return deviations;
}

/** Weighted RMS relative error → match score in [0, 1] (1 = perfect). */
export function computeMatchScore(
  elements: ElementKey[],
  target: TargetPpm,
  achieved: TargetPpm,
  options?: ToleranceOptions,
): { matchScore: number; weightedError: number } {
  let weightSum = 0;
  let errSum = 0;

  for (const element of elements) {
    const t = target[element] ?? 0;
    if (t <= 0) continue;
    const a = achieved[element] ?? 0;
    const w = resolveWeight(element, options);
    const rel = (a - t) / t;
    errSum += w * rel * rel;
    weightSum += w;
  }

  const weightedError = weightSum > 0 ? Math.sqrt(errSum / weightSum) : 0;
  const matchScore = Math.max(0, Math.min(1, 1 - weightedError));
  return { matchScore, weightedError };
}
