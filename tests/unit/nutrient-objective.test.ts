import { describe, expect, it } from 'vitest';
import {
  buildChemistryMatrix,
  checkHardConstraints,
  collectGroups,
  computeObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  legacyDeclaredLines,
} from '@growlog/nutrient-calc';

describe('solver objective and constraints', () => {
  it('penalises micro overdose more than underdose', () => {
    const target = { Fe: 1 };
    const over = computeObjective(['Fe'], target, { Fe: 1.5 }, DEFAULT_SOLVER_OBJECTIVE);
    const under = computeObjective(['Fe'], target, { Fe: 0.5 }, DEFAULT_SOLVER_OBJECTIVE);
    expect(over).toBeGreaterThan(under);
  });

  it('penalises unsolicited elements with zero target using reference ppm', () => {
    const withCo = computeObjective(['Co'], {}, { Co: 0.1 }, DEFAULT_SOLVER_OBJECTIVE);
    const clean = computeObjective(['Co'], {}, { Co: 0 }, DEFAULT_SOLVER_OBJECTIVE);
    expect(withCo).toBeGreaterThan(clean);
  });

  it('hydroodo_legacy stacks total N and NO3 into N row (FloraDuo)', () => {
    const declared = { N: 2, NO3: 5, P2O5: 5, K2O: 3 };
    const lines = legacyDeclaredLines(declared);
    const nLines = lines.filter((l) => l.group === 'N');
    expect(nLines.length).toBe(2);
    const totalN = nLines.reduce((s, l) => s + l.mgPerLPerUnit, 0);
    const ferts = [
      {
        id: 'fd',
        name: 'FloraDuo',
        physicalForm: 'liquid' as const,
        doseUnit: 'ml_per_L' as const,
        declaredPct: declared,
        elementalPct: {},
      },
    ];
    const groups = collectGroups(ferts, { N: 10 }, 'hydroodo_legacy');
    const A = buildChemistryMatrix(ferts, groups, 'hydroodo_legacy');
    const i = groups.indexOf('N');
    expect(A[i][0]).toBeCloseTo(totalN, 6);
  });

  it('hard overdose cap rejects high achievement', () => {
    const v = checkHardConstraints({
      groups: ['K'],
      netTarget: { K: 100 },
      achieved: { K: 125 },
      doses: [1],
      options: { overdosePctByGroup: { K: 20 } },
    });
    expect(v.some((x) => x.code === 'overdose_cap')).toBe(true);
  });
});
