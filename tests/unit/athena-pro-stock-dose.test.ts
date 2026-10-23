import { describe, expect, it } from 'vitest';
import {
  athenaProStockMlPerGalToDryGramsPerL,
} from '../../packages/nutrient-calc/src/athena-pro-stock-dose.ts';

describe('Athena Pro stock concentrate → dry g/L', () => {
  it('matches official flower chart (19 mL/gal Core, 32 mL/gal Bloom @ 2 lb/gal stock)', () => {
    const core = athenaProStockMlPerGalToDryGramsPerL(19);
    const bloom = athenaProStockMlPerGalToDryGramsPerL(32);
    expect(core).toBeGreaterThan(1.1);
    expect(core).toBeLessThan(1.3);
    expect(bloom).toBeGreaterThan(1.9);
    expect(bloom).toBeLessThan(2.1);
  });
});
