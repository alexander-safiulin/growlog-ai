import { describe, expect, it } from 'vitest';

import {
  buildLeafJournalContext,
  LEAF_SKILL_VERSION,
  matchLeafHypotheses,
  type LeafObservationCard,
} from '@growlog/domain';

describe('leaf skill v1', () => {
  it('ranks magnesium on older interveinal chlorosis', () => {
    const obs: LeafObservationCard = {
      leaf_age: 'older',
      canopy_position: 'lower',
      color_pattern: 'interveinal_chlorosis',
      vein_status: 'veins_green',
      edge_symptom: 'none',
      spotting: 'none',
    };
    const result = matchLeafHypotheses(obs, { substratePh: 6.2, substrateEc: 1.8, lastFeedingAt: '2026-10-28T10:00:00Z' });
    expect(result.version).toBe(LEAF_SKILL_VERSION);
    expect(result.hypotheses[0]?.code).toBe('magnesium');
    expect(result.grounded_facts.some((f) => f.includes('pH'))).toBe(true);
  });

  it('ranks iron on young upper interveinal with high pH hint', () => {
    const obs: LeafObservationCard = {
      leaf_age: 'newer',
      canopy_position: 'upper',
      color_pattern: 'interveinal_chlorosis',
      vein_status: 'veins_green',
      edge_symptom: 'none',
      spotting: 'none',
    };
    const result = matchLeafHypotheses(obs, { substratePh: 7.1 });
    const codes = result.hypotheses.map((h) => h.code);
    expect(codes).toContain('iron');
  });

  it('asks for canopy photo when position unknown', () => {
    const obs: LeafObservationCard = {
      leaf_age: 'unknown',
      canopy_position: 'unknown',
      color_pattern: 'uniform_yellow',
      vein_status: 'unknown',
      edge_symptom: 'unknown',
      spotting: 'unknown',
    };
    const result = matchLeafHypotheses(obs, {});
    expect(result.next_step.kind).toBe('ask_photo');
    expect(result.missing_data.some((m) => m.includes('Кадр куста'))).toBe(true);
  });

  it('prefers light burn on upper bleached spots', () => {
    const obs: LeafObservationCard = {
      leaf_age: 'newer',
      canopy_position: 'upper',
      color_pattern: 'bleached_spots',
      vein_status: 'no_contrast',
      edge_symptom: 'burn',
      spotting: 'none',
    };
    const result = matchLeafHypotheses(obs, {});
    expect(result.hypotheses[0]?.code).toBe('light_burn');
  });

  it('builds journal context from readings and feeding events', () => {
    const ctx = buildLeafJournalContext({
      sensorReadings: [
        { metricCode: 'ph', value: 5.9, recordedAt: '2026-10-29T08:00:00Z' },
        { metricCode: 'ec', value: 2.1, recordedAt: '2026-10-29T08:00:00Z' },
      ],
      recentEvents: [
        { eventType: 'watering', occurredAt: '2026-10-28T12:00:00Z', body: 'Flush' },
        { eventType: 'feeding', occurredAt: '2026-10-29T09:00:00Z', title: 'Bloom A+B' },
      ],
    });
    expect(ctx.substratePh).toBe(5.9);
    expect(ctx.substrateEc).toBe(2.1);
    expect(ctx.lastFeedingLabel).toContain('Bloom');
  });
});
