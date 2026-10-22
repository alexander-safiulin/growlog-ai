import { describe, expect, it } from 'vitest';
import {
  neutralizeBicarbonateWithAcid,
  prepareTargetWithSourceWater,
  bicarbonateMgPerLFromProfile,
} from '@growlog/nutrient-calc';

describe('source water profile', () => {
  it('subtracts water ions before net target', () => {
    const { netTarget } = prepareTargetWithSourceWater(
      { K: 200, Ca: 100 },
      { ppm: { K: 20, Ca: 10 } },
    );
    expect(netTarget.K).toBe(180);
    expect(netTarget.Ca).toBe(90);
  });

  it('warns when water exceeds target for an element', () => {
    const prep = prepareTargetWithSourceWater({ K: 50 }, { ppm: { K: 80 } });
    expect(prep.warnings).toContain('water_exceeds_target:K');
    expect(prep.netTarget.K).toBe(0);
  });

  it('converts CaCO3-equivalent alkalinity to HCO3 mg/L', () => {
    const hco3 = bicarbonateMgPerLFromProfile({
      alkalinityHco3Ppm: 100,
      alkalinityAsCaco3Equivalent: true,
    });
    expect(hco3).toBeCloseTo(122.032, 1);
  });

  it('HNO3 neutralization adds nitrate-N', () => {
    const neu = neutralizeBicarbonateWithAcid(61.016, 'HNO3');
    expect(neu.hco3NeutralizedMmolPerL).toBeCloseTo(1, 3);
    expect(neu.addedPpm.N_NO3).toBeCloseTo(14.007, 2);
  });

  it('acid product strength yields mL/L', () => {
    const neu = neutralizeBicarbonateWithAcid(61.016, 'HNO3', {
      acid: 'HNO3',
      strengthMassPct: 65,
      densityGPerMl: 1.4,
    });
    expect(neu.acidMlPerL).toBeGreaterThan(0);
  });

  it('residual HCO3 leaves alkalinity partially un-neutralized', () => {
    const prep = prepareTargetWithSourceWater(
      { N_NO3: 210 },
      { alkalinityHco3Ppm: 122.032 },
      { neutralizeAlkalinityWith: 'HNO3', residualHco3MmolPerL: 0.5 },
    );
    expect(prep.effectiveWaterPpm.HCO3).toBeCloseTo(0.5 * 61.016, 0);
  });
});
