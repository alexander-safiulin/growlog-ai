import { describe, expect, it } from 'vitest';
import { elementalFractionTable, type FertilizerSpec } from '@growlog/nutrient-calc';
import {
  formatNutrientPercent,
  formatNutrientPpm,
  showNutrientElementRow,
} from '@/lib/nutrient/format-nutrient-amount';

describe('nutrient amount display', () => {
  it('shows molybdenum ppm instead of 0.0', () => {
    expect(formatNutrientPpm(0.01)).toBe('0.01');
    expect(formatNutrientPpm(0.005)).toBe('0.005');
    expect(formatNutrientPpm(105.5)).toBe('105.5');
    expect(formatNutrientPpm(1.6)).toBe('1.6');
  });

  it('shows sub-0.001% molybdenum in a product', () => {
    expect(formatNutrientPercent(0.0008)).toBe('0.0008');
    expect(formatNutrientPercent(39.65)).toBe('39.65');
  });

  it('keeps an untargeted molybdenum row at a normal micro dose', () => {
    expect(showNutrientElementRow(0, 0.008)).toBe(true);
    expect(showNutrientElementRow(0.01, 0)).toBe(true);
    expect(showNutrientElementRow(0, 0.00001)).toBe(false);
  });

  it('includes label molybdenum in the elemental fraction table', () => {
    const micro: FertilizerSpec = {
      id: 'micro',
      name: 'Micro',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      elementalPct: { Mo: 0.0008, Fe: 0.054 },
      declaredPct: { Mo: 0.0008, Fe: 0.054 },
    };
    const rows = elementalFractionTable([micro]);
    expect(rows.find((row) => row.element === 'Mo')?.pctInProduct).toBeCloseTo(0.0008, 6);
    expect(rows.find((row) => row.element === 'Fe')?.pctInProduct).toBeCloseTo(0.054, 6);
  });
});
