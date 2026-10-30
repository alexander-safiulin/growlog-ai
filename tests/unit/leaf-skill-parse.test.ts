import { describe, expect, it } from 'vitest';

import {
  extractStoredLeafSkill,
  LEAF_SKILL_SIGNAL_KEY,
  parseLeafObservationCard,
  photoAnalysisHasLeafSkill,
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

  it('drops hypotheses with unknown codes', () => {
    const signals = {
      [LEAF_SKILL_SIGNAL_KEY]: {
        observation: {},
        result: {
          version: 'leaf_diagnosis_v1',
          observation: {},
          hypotheses: [
            { code: 'not_a_real_code', label: 'X', score: 1, rationale: 'x' },
            { code: 'nitrogen', label: 'N', score: 0.8, rationale: 'x' },
          ],
          missing_data: [],
          grounded_facts: [],
          next_step: { kind: 'none', prompt: 'ok' },
        },
      },
    };
    const stored = extractStoredLeafSkill(signals);
    expect(stored?.result.hypotheses).toHaveLength(1);
    expect(stored?.result.hypotheses[0]?.code).toBe('nitrogen');
  });

  it('photoAnalysisHasLeafSkill detects stored leaf block', () => {
    expect(photoAnalysisHasLeafSkill({ issues: [] })).toBe(false);
    expect(photoAnalysisHasLeafSkill(null)).toBe(false);
    const signals = {
      [LEAF_SKILL_SIGNAL_KEY]: {
        observation: {},
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
    expect(photoAnalysisHasLeafSkill(signals)).toBe(true);
  });
});
