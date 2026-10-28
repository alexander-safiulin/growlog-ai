import { describe, expect, it } from 'vitest';
import { solveReverse, type FertilizerSpec } from '@growlog/nutrient-calc';
import { nitrogenBreakdown, nitrogenRowVisible } from '@/lib/nutrient/nitrogen-breakdown';

function fert(declaredPct: Record<string, number>): FertilizerSpec {
  return {
    id: 'npk',
    name: 'NPK',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct,
    elementalPct: {},
  };
}

describe('nitrogenBreakdown', () => {
  it('shows label-total nitrogen once, as an unknown form', () => {
    const solved = solveReverse({
      doses: [{ fertilizer: fert({ N: 16, P2O5: 8, K2O: 16 }), amountPerL: 1 }],
      options: { model: 'canonical' },
    });
    const achieved = solved.achievedPpm as Record<string, number>;
    expect(achieved.N_NO3 ?? 0).toBe(0);
    expect(achieved.N).toBeCloseTo(160, 5);
    expect(achieved.N_UNKNOWN).toBeCloseTo(achieved.N, 5);

    const row = nitrogenBreakdown({ N: 100 }, achieved);
    expect(nitrogenRowVisible(row)).toBe(true);
    expect(row.targetPpm).toBe(100);
    expect(row.achievedPpm).toBeCloseTo(160, 5);
    expect(row.forms.map((form) => form.key)).toEqual(['N_UNKNOWN']);
    expect(row.forms[0]?.achievedPpm).toBeCloseTo(160, 5);
    expect(row.forms[0]?.targetPpm).toBe(0);
  });

  it('keeps nitrate and ammonium as separate forms under the total', () => {
    const solved = solveReverse({
      doses: [{ fertilizer: fert({ NO3: 10, NH4: 2 }), amountPerL: 1 }],
      options: { model: 'canonical' },
    });
    const achieved = solved.achievedPpm as Record<string, number>;
    const row = nitrogenBreakdown({ N_NO3: 80, N_NH4: 20 }, achieved);
    expect(row.targetPpm).toBe(100);
    expect(row.achievedPpm).toBeCloseTo(120, 5);
    expect(row.forms.map((form) => [form.key, form.achievedPpm])).toEqual([
      ['N_NO3', achieved.N_NO3],
      ['N_NH4', achieved.N_NH4],
    ]);
  });

  it('does not add the duplicate N key on top of N_UNKNOWN', () => {
    const row = nitrogenBreakdown({ N: 105 }, { N: 80, N_UNKNOWN: 80, N_NO3: 40 });
    expect(row.achievedPpm).toBe(120);
    expect(row.targetPpm).toBe(105);
    expect(row.forms.map((form) => form.key)).toEqual(['N_NO3', 'N_UNKNOWN']);
  });

  it('matches a nitrate-only target without inventing an unknown goal', () => {
    const row = nitrogenBreakdown({ N_NO3: 210 }, { N_NO3: 200 });
    expect(row.targetPpm).toBe(210);
    expect(row.achievedPpm).toBe(200);
    expect(row.forms).toEqual([
      expect.objectContaining({ key: 'N_NO3', targetPpm: 210, achievedPpm: 200 }),
    ]);
  });
});
