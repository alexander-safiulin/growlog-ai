import { describe, expect, it } from 'vitest';

import { buildStageTimeline, computeCycleSummaryTotals } from '@growlog/domain';

describe('cycle summary totals', () => {
  it('sums water, feedings, and fertilizer by product', () => {
    const timeline = buildStageTimeline({
      cycleStartDate: '2026-10-01',
      initialStage: 'veg',
      transitions: [],
      timeZone: 'UTC',
    });
    const totals = computeCycleSummaryTotals({
      cycleStartDate: '2026-10-01',
      timeZone: 'UTC',
      today: new Date('2026-10-10T12:00:00Z'),
      stageTimeline: timeline,
      feedingRows: [
        {
          entry_kind: 'watering',
          volume_ml: 2000,
          doses: [],
        },
        {
          entry_kind: 'feeding',
          volume_ml: 3000,
          doses: [{ product_label: 'Grow', amount_ml: 15, fertilizer_product_id: 'p1', farm_fertilizer_product_id: null }],
        },
      ],
      harvest: { wet_weight_kg: 2.5, dry_weight_kg: 0.5 },
      plantCount: 2,
    });
    expect(totals.totalWaterLiters).toBe(5);
    expect(totals.feedingCount).toBe(1);
    expect(totals.fertilizerTotals[0]?.totalMl).toBe(15);
    expect(totals.gramsPerPlant).toBe(250);
  });
});
