import { describe, expect, it } from 'vitest';

import { formatRetrievalContextForPrompt } from '@/lib/growlog/assemble-retrieval-context';
import { summarizeSolutionSnapshotForRetrieval } from '@/lib/growlog/retrieval/solution-snapshot-summary';
import { makeAnswerAssemblyContext } from './fixtures/assembly-context';

describe('summarizeSolutionSnapshotForRetrieval', () => {
  it('compresses recipe doses and elements for prompt', () => {
    const summary = summarizeSolutionSnapshotForRetrieval({
      name: 'Veg A',
      ec_ms_calculated: 1.6,
      doses_per_l: [{ product_label: 'CalMag', dose_per_l: 1, unit: 'ml_per_L' }],
      elements_mg_per_l: { N: 120, K: 80 },
    });
    expect(summary).toContain('recipe=Veg A');
    expect(summary).toContain('EC≈1.6');
    expect(summary).toContain('CalMag');
    expect(summary).toContain('N=120');
  });
});

describe('formatRetrievalContextForPrompt cycle_brief', () => {
  it('includes cultivar and feeding snapshot without full_cycle keywords', () => {
    const ctx = makeAnswerAssemblyContext({
      request: {
        queryText: 'как дела?',
        intentType: 'status',
        subIntents: [],
        diagnosticRiskLevel: 'low',
      },
      cycleBrief: {
        cultivarSummary: 'Blue Dream',
        plantCount: 4,
        plants: [
          {
            id: 'p1',
            plantCode: 'P-01',
            cultivarName: 'Blue Dream',
            status: 'active',
          },
        ],
        light: { lightHoursOn: 18, lightHoursOff: 6, lightsOnAt: '06:00' },
        recentFeedings: [
          {
            id: 'fe1',
            eventId: 'ev1',
            entryKind: 'watering',
            occurredAt: '2026-03-20T10:00:00.000Z',
            volumeMl: 1500,
            ph: 6.2,
            ecMs: 1.1,
            recipeName: 'Veg mix',
            solutionSnapshotSummary: 'recipe=Veg mix · EC≈1.4',
          },
        ],
        growerJournalEvents: [],
        sensorDailyStats: [
          {
            id: 's1',
            statDate: '2026-03-20',
            metricCode: 'air_temp',
            metricName: 'Air temp',
            minValue: 22,
            maxValue: 26,
            avgValue: 24,
            readingCount: 48,
            unit: 'C',
          },
        ],
        sensorLatestByMetric: [
          {
            metricCode: 'air_rh',
            metricName: 'RH',
            valueNumeric: 55,
            unit: '%',
            capturedAt: '2026-03-20T18:00:00.000Z',
          },
        ],
      },
    });

    const text = formatRetrievalContextForPrompt(ctx);
    expect(text).toContain('--- cycle_brief');
    expect(text).toContain('Blue Dream');
    expect(text).toContain('recipe=Veg mix · EC≈1.4');
    expect(text).toContain('cycle_brief.sensor_daily_stats');
    expect(text).toContain('Air temp');
  });

  it('recent_events block can show watering when sensor_snapshot is excluded from fetch', () => {
    const ctx = makeAnswerAssemblyContext({
      recentEvents: [
        {
          id: 'w1',
          occurredAt: '2026-03-21T09:00:00.000Z',
          eventType: 'watering',
          title: null,
          body: 'Полив, 2000 мл',
          scopeId: null,
          severity: null,
          relevanceScore: 1,
        },
      ],
    });
    const text = formatRetrievalContextForPrompt(ctx);
    expect(text).toContain('watering');
    expect(text).toContain('2000');
    expect(text).not.toMatch(/sensor_snapshot.*recent_events/s);
  });
});
