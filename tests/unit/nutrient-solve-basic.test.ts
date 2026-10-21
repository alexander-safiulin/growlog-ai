import { describe, expect, it } from 'vitest';
import { solveForward, solveReverseHydroodo } from '@growlog/nutrient-calc';
import type { FertilizerSpec } from '@growlog/nutrient-calc';

describe('solver basics', () => {
  it('synthetic two-fertilizer hydroodo mix is consistent forward/reverse', () => {
    const fertilizers: FertilizerSpec[] = [
      {
        id: 'a',
        name: 'Salt A',
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        declaredPct: { K2O: 50 },
        elementalPct: {},
      },
      {
        id: 'b',
        name: 'Salt B',
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        declaredPct: { P2O5: 50 },
        elementalPct: {},
      },
    ];

    const target = { K: 100, P: 50 };
    const result = solveForward({
      target,
      fertilizers,
      options: { overdosePctByGroup: { K: 20, P: 20 }, doseDecimals: 3 },
    });

    expect(result.best.doses.length).toBeGreaterThan(0);
    const achieved = solveReverseHydroodo(
      result.best.doses.map((d) => {
        const fert = fertilizers.find((f) => f.id === d.fertilizerId)!;
        return { declaredPct: fert.declaredPct!, dosePerL: d.amountPerL };
      }),
    );
    expect(achieved.K).toBeGreaterThan(0);
    expect(achieved.P).toBeGreaterThan(0);
  });

  it('doses are non-negative and deterministic', () => {
    const fertilizers: FertilizerSpec[] = [
      {
        id: 'ca',
        name: 'Ca nitrate',
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        declaredPct: { NO3: 11.6, Ca: 16.6 },
        elementalPct: {},
      },
    ];
    const r1 = solveForward({ target: { N: 50, Ca: 70 }, fertilizers });
    const r2 = solveForward({ target: { N: 50, Ca: 70 }, fertilizers });
    expect(r1.best.doses[0]?.amountPerL).toBe(r2.best.doses[0]?.amountPerL);
    expect(r1.best.doses.every((d) => d.amountPerL >= 0)).toBe(true);
  });
});
