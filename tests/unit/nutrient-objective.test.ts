import { describe, expect, it } from 'vitest';
import { checkHardConstraints, computeObjective, DEFAULT_SOLVER_OBJECTIVE } from '@growlog/nutrient-calc';

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
