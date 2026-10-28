import { describe, expect, it } from 'vitest';
import { mapDbProductsToFertilizerSpecs, solveReverse, type DbCompositionLineRow, type DbFertilizerProductRow, type SolveSolution } from '@growlog/nutrient-calc';
import { applyManualDoseAmounts, doseLineKey, isManualDose } from '@/lib/nutrient/manual-dose';

function potassiumSpec() {
  const row: DbFertilizerProductRow = {
    id: 'k-salt',
    external_key: 'lab|k',
    brand: 'Lab',
    name: 'Potassium salt',
    physical_form: 'solid',
    dose_unit: 'g_per_L',
    metadata: {},
  };
  const lines: DbCompositionLineRow[] = [{ product_id: 'k-salt', form_key: 'K', value_pct: 50 }];
  return mapDbProductsToFertilizerSpecs([row], lines)[0]!;
}

describe('applyManualDoseAmounts', () => {
  it('keeps the solver result when the typed dose matches it', () => {
    const spec = potassiumSpec();
    const solved = solveReverse({
      doses: [{ fertilizer: spec, amountPerL: 1, unit: 'g_per_L' }],
      options: { model: 'canonical' },
    });
    const solution: SolveSolution = {
      doses: [{ fertilizerId: spec.id, fertilizerName: spec.name, amountPerL: 1, unit: 'g_per_L', tank: 'single' }],
      achievedPpm: solved.achievedPpm,
      deviations: [],
      matchScore: 1,
      weightedError: 0,
      warnings: [],
    };
    const specs = new Map([[spec.id, spec]]);
    expect(applyManualDoseAmounts(solution, { [doseLineKey(spec.id, 'single')]: 1 }, specs, 100)).toBe(solution);
    expect(isManualDose(1, 1)).toBe(false);
  });

  it('scales the element profile, tank mass, and stock from the edited grams per liter', () => {
    const spec = potassiumSpec();
    const solved = solveReverse({
      doses: [{ fertilizer: spec, amountPerL: 1, unit: 'g_per_L' }],
      options: { model: 'canonical' },
    });
    const solution = {
      doses: [
        {
          fertilizerId: spec.id,
          fertilizerName: spec.name,
          amountPerL: 1,
          unit: 'g_per_L' as const,
          tank: 'b' as const,
          amountTotal: 100,
          stockAmountPerL: 100,
        },
      ],
      achievedPpm: solved.achievedPpm,
      deviations: [],
      matchScore: 1,
      weightedError: 0,
      ecEstimateMsCm: solved.ecEstimateMsCm,
      warnings: [],
    } as SolveSolution;
    const edited = applyManualDoseAmounts(
      solution,
      { [doseLineKey(spec.id, 'b')]: 2 },
      new Map([[spec.id, spec]]),
      100,
    );
    const dose = edited.doses[0] as { amountPerL: number; amountTotal?: number; stockAmountPerL?: number };
    expect(dose.amountPerL).toBe(2);
    expect(dose.amountTotal).toBe(200);
    expect(dose.stockAmountPerL).toBe(200);
    const before = (solved.achievedPpm as Record<string, number>).K ?? 0;
    const after = (edited.achievedPpm as Record<string, number>).K ?? 0;
    expect(before).toBeGreaterThan(0);
    expect(after).toBeCloseTo(before * 2, 3);
    expect(edited.ecEstimateMsCm).not.toBe(solution.ecEstimateMsCm);
    expect(isManualDose(1, 2)).toBe(true);
  });

  it('recomputes ppm when a zero placeholder row is raised manually', () => {
    const spec = potassiumSpec();
    const solution: SolveSolution = {
      doses: [{ fertilizerId: spec.id, fertilizerName: spec.name, amountPerL: 0, unit: 'g_per_L', tank: 'single' }],
      achievedPpm: { K: 50 },
      deviations: [],
      matchScore: 0.5,
      weightedError: 0.2,
      warnings: [],
    };
    const edited = applyManualDoseAmounts(
      solution,
      { [doseLineKey(spec.id, 'single')]: 1 },
      new Map([[spec.id, spec]]),
      100,
    );
    expect(edited.doses[0]?.amountPerL).toBe(1);
    expect((edited.achievedPpm as Record<string, number>).K ?? 0).toBeGreaterThan(50);
  });
});
