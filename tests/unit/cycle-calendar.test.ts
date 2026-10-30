import { describe, expect, it } from 'vitest';

import {
  aggregateCycleDayMarkers,
  buildCalendarMonthGrid,
  buildStageTimeline,
  farmDateFromIso,
  presentFeedEvents,
  resolvedEventPhotoAttachments,
  shiftCalendarDate,
  weekdayIndexMondayFirst,
  type EventRow,
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

  it('does not duplicate feeding marker when structured row exists', () => {
    const markers = aggregateCycleDayMarkers({
      timeZone: 'UTC',
      feedingRows: [
        {
          event_id: 'ev-1',
          occurred_at: '2026-10-23T10:00:00.000Z',
          entry_kind: 'feeding',
          volume_ml: 1000,
          ph: null,
          ec_ms: null,
          air_temp_c: null,
          air_rh_pct: null,
          recipe_name: null,
          comment: null,
          doses: [{ product_label: 'A', amount_ml: 5, fertilizer_product_id: 'p', farm_fertilizer_product_id: null }],
        },
      ],
      events: [
        { id: 'ev-1', event_type: 'feeding', occurred_at: '2026-10-23T10:00:00.000Z' },
      ],
    });
    const day = '2026-10-23';
    expect(markers[day]?.feedingColors?.length).toBe(1);
  });
});

function feedEvent(partial: Partial<EventRow> & Pick<EventRow, 'id' | 'event_type' | 'created_at'>): EventRow {
  return {
    farm_id: 'farm',
    cycle_id: 'cycle',
    scope_id: 'scope',
    title: null,
    body: 'Проверка 2. Натянули СКРОГ',
    occurred_at: '2026-10-29T12:00:00.000Z',
    source_type: 'user_form',
    payload: {},
    ...partial,
  };
}

describe('presentFeedEvents', () => {
  it('collapses repeated procedure saves and folds the matching photo onto the first one', () => {
    const presented = presentFeedEvents([
      feedEvent({
        id: 'p1',
        event_type: 'action_taken',
        created_at: '2026-10-30T04:00:00.000Z',
        payload: { procedure: true },
      }),
      feedEvent({
        id: 'p2',
        event_type: 'action_taken',
        created_at: '2026-10-30T04:05:00.000Z',
        payload: { procedure: true },
      }),
      feedEvent({
        id: 'photo',
        event_type: 'photo_capture',
        created_at: '2026-10-30T04:06:00.000Z',
        source_type: 'file_upload',
        payload: { media_asset_id: 'asset-1' },
      }),
    ]);

    expect(presented.map((event) => event.id)).toEqual(['p1']);
    expect(presented[0]?.mediaAssetIds).toEqual(['asset-1']);
  });

  it('keeps a later identical procedure that was saved on purpose', () => {
    const presented = presentFeedEvents([
      feedEvent({
        id: 'p1',
        event_type: 'action_taken',
        created_at: '2026-10-30T04:00:00.000Z',
        payload: { procedure: true, client_request_id: 'a' },
      }),
      feedEvent({
        id: 'p2',
        event_type: 'action_taken',
        created_at: '2026-10-30T06:30:00.000Z',
        payload: { procedure: true, client_request_id: 'b' },
      }),
    ]);

    expect(presented.map((event) => event.id)).toEqual(['p1', 'p2']);
  });

  it('collapses hung retries that never got a request id, even hours apart', () => {
    const presented = presentFeedEvents([
      feedEvent({
        id: 'p1',
        event_type: 'action_taken',
        created_at: '2026-10-30T04:00:00.000Z',
        payload: { procedure: true },
      }),
      feedEvent({
        id: 'p2',
        event_type: 'action_taken',
        created_at: '2026-10-30T08:00:00.000Z',
        payload: { procedure: true },
      }),
    ]);

    expect(presented.map((event) => event.id)).toEqual(['p1']);
  });

  it('hides a photo already linked to its procedure and keeps a standalone photo', () => {
    const presented = presentFeedEvents([
      feedEvent({
        id: 'p1',
        event_type: 'action_taken',
        created_at: '2026-10-30T04:00:00.000Z',
        payload: { procedure: true, storage_path: 'farm/a.jpg' },
      }),
      feedEvent({
        id: 'linked',
        event_type: 'photo_capture',
        created_at: '2026-10-30T04:01:00.000Z',
        payload: { parent_event_id: 'p1', media_asset_id: 'asset-1', storage_path: 'farm/a.jpg' },
      }),
      feedEvent({
        id: 'solo',
        event_type: 'photo_capture',
        body: 'Другое фото',
        created_at: '2026-10-30T08:00:00.000Z',
        occurred_at: '2026-10-30T08:00:00.000Z',
        payload: { media_asset_id: 'asset-2' },
      }),
    ]);

    expect(presented.map((event) => event.id)).toEqual(['p1', 'solo']);
    expect(presented[0]?.storagePaths).toEqual(['farm/a.jpg']);
    expect(presented[0]?.mediaAssetIds).toEqual(['asset-1']);
  });

  it('pairs storage paths with media asset ids for detail sheet', () => {
    const event = feedEvent({
      id: 'p1',
      payload: { media_asset_id: 'asset-1', storage_path: 'farm/a.jpg' },
    });
    const pairs = resolvedEventPhotoAttachments(event, { 'asset-1': 'farm/a.jpg' });
    expect(pairs).toEqual([{ assetId: 'asset-1', storagePath: 'farm/a.jpg' }]);
  });
});
