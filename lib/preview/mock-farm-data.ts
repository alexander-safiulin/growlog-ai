import type { EventRow, GrowCycle, Scope } from '@/types/database';

/** Demo UUIDs — shapes match ADR-002 tables; values are fictional for design review. */
export const PREVIEW_FARM_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const PREVIEW_CYCLE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const PREVIEW_SCOPE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
export const PREVIEW_FEED_SYSTEM_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

export const previewGrowCycle: GrowCycle = {
  id: PREVIEW_CYCLE_ID,
  farm_id: PREVIEW_FARM_ID,
  site_id: null,
  zone_id: null,
  name: 'Весна 2026',
  cultivar_name: 'Blue Dream',
  batch_code: 'BD-03',
  start_date: '2026-03-01',
  end_date: null,
  status: 'active',
  stage: 'veg',
  goal_profile: null,
  metadata: {},
  created_by: null,
  created_at: '2026-03-01T08:00:00.000Z',
  updated_at: '2026-03-20T10:00:00.000Z',
};

export const previewMainScope: Scope = {
  id: PREVIEW_SCOPE_ID,
  farm_id: PREVIEW_FARM_ID,
  cycle_id: PREVIEW_CYCLE_ID,
  parent_scope_id: null,
  scope_type: 'plant_group',
  display_name: 'Main',
  site_id: null,
  zone_id: null,
  plant_id: null,
  plant_group_id: null,
  active: true,
  metadata: {},
  created_at: '2026-03-01T08:00:00.000Z',
  updated_at: '2026-03-01T08:00:00.000Z',
};

export const previewTimelineEvents: EventRow[] = [
  {
    id: 'e1',
    farm_id: PREVIEW_FARM_ID,
    cycle_id: PREVIEW_CYCLE_ID,
    scope_id: PREVIEW_SCOPE_ID,
    event_type: 'feeding',
    title: 'Кормление',
    body: 'EC 1,6 мСм/см, pH 5,8. Листья бодрые, без ожогов.',
    occurred_at: '2026-03-23T09:15:00.000Z',
    source_type: 'user_form',
    payload: {},
    created_at: '2026-03-23T09:16:00.000Z',
  },
  {
    id: 'e2',
    farm_id: PREVIEW_FARM_ID,
    cycle_id: PREVIEW_CYCLE_ID,
    scope_id: PREVIEW_SCOPE_ID,
    event_type: 'observation',
    title: null,
    body: 'Верхние узлы тянутся равномерно. Влажность ночью чуть выше нормы.',
    occurred_at: '2026-03-22T20:40:00.000Z',
    source_type: 'user_form',
    payload: {},
    created_at: '2026-03-22T20:41:00.000Z',
  },
  {
    id: 'e3',
    farm_id: PREVIEW_FARM_ID,
    cycle_id: PREVIEW_CYCLE_ID,
    scope_id: PREVIEW_SCOPE_ID,
    event_type: 'watering',
    title: 'Полив',
    body: 'Сток 12 %, дренаж чистый.',
    occurred_at: '2026-03-21T11:00:00.000Z',
    source_type: 'user_form',
    payload: {},
    created_at: '2026-03-21T11:01:00.000Z',
  },
];

export const previewFeedSystem = {
  id: PREVIEW_FEED_SYSTEM_ID,
  name: 'Coco A+B · вега',
  steps: [
    {
      id: 'step-1',
      week_label: 'Неделя 3',
      stage: 'veg',
      ec_target_ms_cm: 1.4,
      ph_target: 5.8,
      target_ppm: { N: 180, P: 45, K: 220 },
    },
    {
      id: 'step-2',
      week_label: 'Неделя 4',
      stage: 'veg',
      ec_target_ms_cm: 1.6,
      ph_target: 5.8,
      target_ppm: { N: 200, P: 50, K: 240 },
    },
  ],
  activeStepId: 'step-2',
};
