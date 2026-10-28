import { describe, expect, it } from 'vitest';
import {
  neutralizeBicarbonateWithAcid,
  prepareTargetWithSourceWater,
  bicarbonateMgPerLFromProfile,
  solveForward,
  type FertilizerSpec,
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

  it('warns when water adds element not in target (e.g. Na, Cl)', () => {
    const prep = prepareTargetWithSourceWater({ K: 100 }, { ppm: { Na: 20, Cl: 15 } });
    expect(prep.warnings).toContain('water_exceeds_target:Na');
    expect(prep.warnings).toContain('water_exceeds_target:Cl');
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

  it('counts water nitrate, ammonium and urea toward a total-N target', () => {
    const prep = prepareTargetWithSourceWater(
      { N: 100, K: 50 },
      { ppm: { N_NO3: 20, N_NH4: 5, N_UREA: 5, K: 5 } },
    );
    expect(prep.effectiveWaterPpm.N_NO3).toBe(20);
    expect(prep.effectiveWaterPpm.N_NH4).toBe(5);
    expect(prep.effectiveWaterPpm.N_UREA).toBe(5);
    expect(prep.netTarget.N).toBe(70);
    expect(prep.netTarget.K).toBe(45);
    expect(prep.netTarget.N_NO3 ?? 0).toBe(0);
    expect(prep.warnings).not.toContain('water_exceeds_target:N_NO3');
  });

  it('keeps water nitrate on a nitrate target', () => {
    const prep = prepareTargetWithSourceWater({ N_NO3: 100 }, { ppm: { N_NO3: 20 } });
    expect(prep.netTarget.N_NO3).toBe(80);
    expect(prep.netTarget.N ?? 0).toBe(0);
  });

  it('warns on N when water nitrogen exceeds a total-N target', () => {
    const prep = prepareTargetWithSourceWater({ N: 10 }, { ppm: { N_NO3: 25 } });
    expect(prep.netTarget.N).toBe(0);
    expect(prep.warnings).toContain('water_exceeds_target:N');
    expect(prep.warnings).not.toContain('water_exceeds_target:N_NO3');
  });

  it('counts nitric-acid nitrate toward a total-N target', () => {
    const prep = prepareTargetWithSourceWater(
      { N: 100 },
      { alkalinityHco3Ppm: 61.016, alkalinityAsCaco3Equivalent: false },
      { neutralizeAlkalinityWith: 'HNO3', residualHco3MmolPerL: 0 },
    );
    expect(prep.effectiveWaterPpm.N_NO3).toBeCloseTo(14.007, 2);
    expect(prep.netTarget.N).toBeCloseTo(100 - 14.007, 2);
    expect(prep.warnings).not.toContain('water_exceeds_target:N_NO3');
  });

  it('doses fertilizer nitrogen net of water nitrate when the goal is total N', () => {
    const fert: FertilizerSpec = {
      id: 'n',
      name: 'nitrate',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { NO3: 10 },
      elementalPct: {},
    };
    const solved = solveForward({
      target: { N: 100 },
      fertilizers: [fert],
      water: { N_NO3: 20 },
      options: { model: 'canonical' },
    });
    expect(solved.netTarget.N).toBe(80);
    expect(solved.best.doses[0]?.amountPerL).toBeCloseTo(0.8, 2);
    expect(solved.best.achievedPpm.N_NO3).toBeCloseTo(100, 1);
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
