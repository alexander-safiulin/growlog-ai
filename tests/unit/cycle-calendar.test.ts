import { describe, expect, it } from 'vitest';

import {
  aggregateCycleDayMarkers,
  buildCalendarMonthGrid,
  buildStageTimeline,
  farmDateFromIso,
  shiftCalendarDate,
  weekdayIndexMondayFirst,
} from '@growlog/domain';

describe('cycle calendar (farm TZ)', () => {
  it('aggregates watering and feeding markers on farm calendar day', () => {
    const markers = aggregateCycleDayMarkers({
      timeZone: 'Europe/Moscow',
      events: [],
      feedingRows: [
        {
          event_id: 'a',
          occurred_at: '2026-10-23T20:00:00.000Z',
          entry_kind: 'watering',
          volume_ml: 1000,
          ph: null,
          ec_ms: null,
          air_temp_c: null,
          air_rh_pct: null,
          recipe_name: null,
          comment: null,
          doses: [],
        },
      ],
    });
    const day = farmDateFromIso('2026-10-23T20:00:00.000Z', 'Europe/Moscow');
    expect(markers[day]?.watering).toBe(true);
  });

  it('starts week grid on Monday', () => {
    expect(weekdayIndexMondayFirst('2026-10-01', 'UTC')).toBe(3);
    const grid = buildCalendarMonthGrid({
      year: 2026,
      month: 10,
      timeZone: 'UTC',
      cycleStartDate: '2026-10-05',
      stageTimeline: buildStageTimeline({
        cycleStartDate: '2026-10-05',
        initialStage: 'veg',
        transitions: [],
        timeZone: 'UTC',
      }),
      dayMarkers: {},
    });
    expect(grid[0].date).toBe(shiftCalendarDate('2026-10-01', -3));
  });
});
