import { describe, expect, it } from 'vitest';
import { mmolToPpm, ppmToMmol, ppmToMeq } from '@growlog/nutrient-calc';

describe('nutrient units', () => {
  it('converts ppm ↔ mmol/L for potassium', () => {
    const ppm = 100;
    const mmol = ppmToMmol('K', ppm);
    expect(mmolToPpm('K', mmol)).toBeCloseTo(ppm, 6);
  });

  it('computes meq/L with valence', () => {
    const meq = ppmToMeq('Ca', 40.078);
    expect(meq).toBeCloseTo(2, 3);
  });
});
