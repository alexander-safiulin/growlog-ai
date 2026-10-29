import { describe, expect, it } from 'vitest';
import { prepareTargetWithSourceWater } from '@growlog/nutrient-calc';
import { sourceWaterFromProfile } from '@/lib/nutrient/water-profile-solver';

describe('sourceWaterFromProfile', () => {
  it('keeps bicarbonate from the analysis as mg/L', () => {
    const mapped = sourceWaterFromProfile({
      water_ppm: { HCO3: 120, Ca: 40 },
      alkalinity_hco3_ppm: null,
    });
    expect(mapped.alkalinityHco3Ppm ?? 0).toBe(0);
    expect(mapped.ppm?.HCO3).toBe(120);
    const prep = prepareTargetWithSourceWater({ Ca: 150 }, mapped);
    expect(prep.effectiveWaterPpm.HCO3).toBe(120);
    expect(prep.netTarget.Ca).toBe(110);
  });

  it('still converts a CaCO3 alkalinity reading', () => {
    const mapped = sourceWaterFromProfile({
      water_ppm: {},
      alkalinity_hco3_ppm: 100,
      alkalinityAsCaco3: true,
    });
    const prep = prepareTargetWithSourceWater({}, mapped);
    expect(prep.effectiveWaterPpm.HCO3).toBeCloseTo(122.032, 1);
  });
});
