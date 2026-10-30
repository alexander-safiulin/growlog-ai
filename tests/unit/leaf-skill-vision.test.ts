import { describe, expect, it } from 'vitest';

import { LEAF_SKILL_SIGNAL_KEY } from '@growlog/domain';
import { applyLeafSkillToAnalysis } from '@/lib/growlog/leaf-skill-vision';

describe('applyLeafSkillToAnalysis', () => {
  it('stores leaf_diagnosis_v1 and derives issues from table scores', () => {
    const pack = applyLeafSkillToAnalysis({
      parsed: {
        summary_text: 'Жёлтые нижние листья',
        tags: ['yellow', 'lower'],
        observation: {
          leaf_age: 'older',
          canopy_position: 'lower',
          color_pattern: 'uniform_yellow',
          vein_status: 'unknown',
          edge_symptom: 'none',
          spotting: 'none',
        },
      },
      journal: { substratePh: 6.0, substrateEc: 1.5, lastFeedingAt: '2026-10-29T10:00:00Z' },
    });

    expect(pack.signals[LEAF_SKILL_SIGNAL_KEY]).toBeTruthy();
    expect(pack.leafResult.hypotheses.length).toBeGreaterThan(0);
    expect(pack.issues_detected[0]?.code).toBe(pack.leafResult.hypotheses[0]?.code);
    expect(pack.issues_detected.every((i) => i.code && i.note)).toBe(true);
  });
});
