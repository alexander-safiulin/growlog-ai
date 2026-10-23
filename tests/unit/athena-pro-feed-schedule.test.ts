import { describe, expect, it } from 'vitest';
import { athenaProStockMlPerGalToDryGramsPerL } from '../../packages/nutrient-calc/src/athena-pro-stock-dose.ts';
import { buildP5ImportModel } from '../../scripts/nutrient-import/p5-manufacturer-import.ts';

describe('Athena Pro feed schedule units', () => {
  it('uses g_per_L dry doses converted from 2 lb/gal stock concentrate', () => {
    const model = buildP5ImportModel();
    const sched = model.feedSchedules.find((s) => s.slug === 'athena-pro-flower-wk1-7-core-bloom');
    expect(sched).toBeTruthy();
    const core = sched!.steps.find((s) => s.product_external_key === 'athena|pro-core');
    const bloom = sched!.steps.find((s) => s.product_external_key === 'athena|pro-bloom');
    expect(core?.unit).toBe('g_per_L');
    expect(bloom?.unit).toBe('g_per_L');
    expect(core!.dose_per_l).toBeCloseTo(athenaProStockMlPerGalToDryGramsPerL(19), 2);
    expect(bloom!.dose_per_l).toBeCloseTo(athenaProStockMlPerGalToDryGramsPerL(32), 2);
  });
});
