import { describe, expect, it } from 'vitest';

import { buildEscalationResponse } from '@/lib/assistant/deterministic-insight';
import {
  mergeEscalationWithPhotoObservation,
  parseEscalationPhotoObservationJson,
} from '@/lib/assistant/escalation-photo-observation';

describe('escalation photo observation', () => {
  it('parses vision JSON', () => {
    const obs = parseEscalationPhotoObservationJson(
      JSON.stringify({
        visual_summary: 'На листьях заметны жёлтые участки по краям.',
        visual_facts: ['Есть зелёная листва'],
        hypotheses: ['Возможен стресс'],
      })
    );
    expect(obs.visual_summary).toMatch(/жёлтые/);
    expect(obs.hypotheses).toHaveLength(1);
  });

  it('merges into escalation without recommendation', () => {
    const base = buildEscalationResponse('ru');
    const merged = mergeEscalationWithPhotoObservation(
      base,
      {
        visual_summary: 'Пятна на листьях.',
        visual_facts: ['Фото показывает куст'],
        hypotheses: ['Похоже на дефицит'],
      },
      '11111111-1111-4111-8111-111111111111',
      'ru'
    );
    expect(merged.recommendation).toBeNull();
    expect(merged.body).toMatch(/Что видно на фото/);
    expect(merged.interpretation).toMatch(/Пятна/);
    expect(merged.trust_flags).toContain('no_treatment_advice');
    expect(merged.grounding.some((g) => g.source_type === 'media_asset')).toBe(true);
  });
});
