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

  it('converts CaCO3-equivalent alkalinity to HCO3 mg/L', () => {
    const hco3 = bicarbonateMgPerLFromProfile({
      alkalinityHco3Ppm: 100,
      alkalinityAsCaco3Equivalent: true,
    });
    expect(hco3).toBeCloseTo(122.032, 1);
  });

  it('HNO3 neutralization adds nitrate-N and removes alkalinity warning path', () => {
    const neu = neutralizeBicarbonateWithAcid(61.016, 'HNO3');
    expect(neu.hco3NeutralizedMmolPerL).toBeCloseTo(1, 3);
    expect(neu.addedPpm.N_NO3).toBeCloseTo(14.007, 2);
    expect(neu.acidMgPerL).toBeCloseTo(63.008, 2);
  });

  it('H3PO4 neutralization adds elemental P', () => {
    const neu = neutralizeBicarbonateWithAcid(61.016, 'H3PO4');
    expect(neu.addedPpm.P).toBeCloseTo(30.974, 2);
  });

  it('prepareTarget credits acid-derived ions into effective water', () => {
    const prep = prepareTargetWithSourceWater(
      { N_NO3: 210, K: 200 },
      { alkalinityHco3Ppm: 61.016 },
      { neutralizeAlkalinityWith: 'HNO3' },
    );
    expect(prep.effectiveWaterPpm.N_NO3).toBeCloseTo(14.007, 1);
    expect(prep.netTarget.N_NO3).toBeCloseTo(210 - 14.007, 0);
    expect(prep.acid?.acid).toBe('HNO3');
  });
});
