import { describe, expect, it } from 'vitest';
import type { SolveSolution } from '@growlog/nutrient-calc';
import {
  buildWandVariantCompareRows,
  classifyDeviation,
  WAND_COMPARE_AMBER_MAX_ABS_PCT,
  WAND_COMPARE_NEUTRAL_MAX_ABS_PCT,
} from '@/lib/nutrient/wand-variant-compare';

function solution(partial: Partial<SolveSolution> & Pick<SolveSolution, 'matchScore'>): SolveSolution {
  return {
    doses: [],
    achievedPpm: {},
    deviations: [],
    weightedError: 0,
    warnings: [],
    ...partial,
  };
}

describe('classifyDeviation', () => {
  it('marks absolute deviation below neutral max as ok', () => {
    expect(WAND_COMPARE_NEUTRAL_MAX_ABS_PCT).toBe(10);
    expect(classifyDeviation(9).severity).toBe('ok');
    expect(classifyDeviation(-9.9).severity).toBe('ok');
  });

  it('marks 10% to below amber max as amber and at/above amber max as red', () => {
    expect(WAND_COMPARE_AMBER_MAX_ABS_PCT).toBe(20);
    expect(classifyDeviation(10).severity).toBe('amber');
    expect(classifyDeviation(19.9).severity).toBe('amber');
    expect(classifyDeviation(20).severity).toBe('red');
    expect(classifyDeviation(-25).severity).toBe('red');
  });

  it('distinguishes surplus and deficit', () => {
    expect(classifyDeviation(10).direction).toBe('surplus');
    expect(classifyDeviation(-10).direction).toBe('deficit');
  });
});

describe('buildWandVariantCompareRows', () => {
  it('uses achieved ppm when target is zero', () => {
    const sol = solution({
      matchScore: 0.9,
      achievedPpm: { Fe: 2.5 },
      deviations: [],
    });
    const rows = buildWandVariantCompareRows({
      solutions: [sol],
      target: { Fe: 0 },
      model: 'canonical',
      showMicro: true,
    });
    const feRow = rows.find((r) => r.id === 'Fe');
    expect(feRow?.cells[0]).toEqual({ kind: 'achieved', achievedPpm: 2.5 });
  });

  it('builds deviation cells from solver deviations', () => {
    const sol = solution({
      matchScore: 0.92,
      achievedPpm: { K: 210 },
      deviations: [
        {
          element: 'K',
          targetPpm: 200,
          achievedPpm: 210,
          deltaPpm: 10,
          deltaPct: 5,
          withinTolerance: true,
          overdoseLimitPpm: 240,
          underdoseLimitPpm: 160,
        },
      ],
    });
    const rows = buildWandVariantCompareRows({
      solutions: [sol],
      target: { K: 200 },
      model: 'canonical',
      showMicro: false,
    });
    const kRow = rows.find((r) => r.id === 'K');
    expect(kRow?.cells[0]).toMatchObject({
      kind: 'deviation',
      deltaPct: 5,
      severity: 'ok',
      direction: 'surplus',
    });
  });
});
