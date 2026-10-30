import { describe, expect, it } from 'vitest';

import {
  extractStoredLeafSkill,
  LEAF_SKILL_SIGNAL_KEY,
  parseLeafObservationCard,
} from '@growlog/domain';

describe('parseLeafObservationCard', () => {
  it('coerces invalid enums to unknown', () => {
    const card = parseLeafObservationCard({
      leaf_age: 'ancient',
      color_pattern: 'interveinal_chlorosis',
    });
    expect(card.leaf_age).toBe('unknown');
    expect(card.color_pattern).toBe('interveinal_chlorosis');
  });

  it('extracts stored leaf skill from signals json', () => {
    const signals = {
      [LEAF_SKILL_SIGNAL_KEY]: {
        observation: { leaf_age: 'older', canopy_position: 'lower', color_pattern: 'uniform_yellow', vein_status: 'unknown', edge_symptom: 'none', spotting: 'none' },
        result: {
          version: 'leaf_diagnosis_v1',
          observation: {},
          hypotheses: [{ code: 'nitrogen', label: 'N', score: 0.8, rationale: 'x' }],
          missing_data: [],
          grounded_facts: [],
          next_step: { kind: 'none', prompt: 'ok' },
        },
      },
    };
    const stored = extractStoredLeafSkill(signals);
    expect(stored?.result.hypotheses[0]?.code).toBe('nitrogen');
  });
});
