import { describe, expect, it } from 'vitest';
import type { FertilizerSpec, SolveSolution } from '@growlog/nutrient-calc';
import { padSolutionWithSelectedFertilizers } from '@/lib/nutrient/pad-solution-selected-doses';

function spec(id: string, name: string): FertilizerSpec {
  return {
    id,
    name,
    doseUnit: 'g_per_L',
    physicalForm: 'solid',
    elementalPct: {},
  };
}

function solution(doses: SolveSolution['doses']): SolveSolution {
  return {
    doses,
    achievedPpm: { N: 100 },
    deviations: [],
    matchScore: 0.9,
    weightedError: 0.1,
    warnings: [],
  };
}

describe('padSolutionWithSelectedFertilizers', () => {
  it('adds zero-dose rows for selected products missing from the solver output', () => {
    const ca = spec('ca', 'Calcium nitrate');
    const mg = spec('mg', 'Epsom');
    const k = spec('k', 'K sulfate');
    const padded = padSolutionWithSelectedFertilizers(
      solution([
        {
          fertilizerId: 'ca',
          fertilizerName: 'Calcium nitrate',
          amountPerL: 1.2,
          unit: 'g_per_L',
          tank: 'single',
        },
      ]),
      [ca, mg, k],
      ['mg', 'ca', 'k'],
      50,
    );
    expect(padded.doses.map((d) => d.fertilizerId)).toEqual(['mg', 'ca', 'k']);
    expect(padded.doses.find((d) => d.fertilizerId === 'mg')?.amountPerL).toBe(0);
    expect(padded.doses.find((d) => d.fertilizerId === 'mg')?.amountTotal).toBe(0);
    expect(padded.doses.find((d) => d.fertilizerId === 'ca')?.amountPerL).toBe(1.2);
  });

  it('appends substitute-only doses after the selected block', () => {
    const selected = spec('a', 'Salt A');
    const padded = padSolutionWithSelectedFertilizers(
      solution([
        {
          fertilizerId: 'sub',
          fertilizerName: 'Substitute',
          amountPerL: 0.5,
          unit: 'g_per_L',
          tank: 'single',
        },
      ]),
      [selected],
      ['a'],
      10,
    );
    expect(padded.doses.map((d) => d.fertilizerId)).toEqual(['a', 'sub']);
    expect(padded.doses[0]?.amountPerL).toBe(0);
  });
});
