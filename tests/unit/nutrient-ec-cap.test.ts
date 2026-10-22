import { describe, expect, it } from 'vitest';
import {
  checkHardConstraints,
  defaultEcEstimator,
  estimateEcMsCm,
  solveForward,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';

describe('EC hard cap constraint', () => {
  it('checkHardConstraints flags ec_cap violation', () => {
    const achieved = { N_NO3: 210, K: 234, Ca: 200, P: 31, Mg: 48, S: 64 };
    const ec = estimateEcMsCm(achieved);
    expect(ec).toBeGreaterThan(1.2);
    const violations = checkHardConstraints({
      groups: Object.keys(achieved),
      netTarget: achieved,
      achieved,
      doses: [1],
      options: { maxEcMsCm: ec * 0.5, ecEstimateMsCm: defaultEcEstimator },
      ecMsCm: ec,
    });
    expect(violations.some((v) => v.code === 'ec_cap')).toBe(true);
  });

  const fertilizers: FertilizerSpec[] = [
    {
      id: 'kno3',
      name: 'KNO3',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { NO3: 13.86, K: 38.67 },
      elementalPct: {},
    },
    {
      id: 'cano3',
      name: 'Ca(NO3)2·4H2O',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { NO3: 11.86, Ca: 16.98 },
      elementalPct: {},
    },
  ];

  it('solveForward honors maxEcMsCm when feasible', () => {
    const target = { N_NO3: 80, K: 120, Ca: 100 };
    const tightCap = 0.35;
    const capped = solveForward({
      target,
      fertilizers,
      options: { maxEcMsCm: tightCap, model: 'canonical' },
    });
    const ecCap = capped.best.ecEstimateMsCm ?? estimateEcMsCm(capped.best.achievedPpm);
    if (!capped.best.warnings.includes('infeasible_best_effort')) {
      expect(ecCap).toBeLessThanOrEqual(tightCap + 0.02);
    }
  });
});
