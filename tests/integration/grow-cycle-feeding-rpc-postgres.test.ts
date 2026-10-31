import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGrowCycleFeedingLog } from '@growlog/domain';
import { createPostgresMigratedTestDb, type PostgresTestDb } from './postgres-test-db';
import { postgresSupabaseShim } from './postgres-supabase-shim';

describe('create_grow_cycle_feeding_log RPC on Postgres', () => {
  let db: PostgresTestDb;
  const userId = '44444444-4444-4444-8444-444444444444';
  const farmId = '11111111-1111-4111-8111-111111111111';
  const cycleId = '22222222-2222-4222-8222-222222222222';
  const scopeId = '33333333-3333-4333-8333-333333333333';
  const farmProductId = '55555555-5555-4555-8555-555555555555';
  let catalogProductId: string;

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = process.env.MIGRATION_TEST_USE_DOCKER ?? '1';
    db = await createPostgresMigratedTestDb();
    const { client } = db;
    await client.query(`insert into auth.users (id) values ($1)`, [userId]);
    await client.query(`insert into public.farms (id, name, timezone) values ($1, 'Cycle RPC', 'UTC')`, [
      farmId,
    ]);
    await client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [farmId, userId],
    );
    await client.query(
      `insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, start_material, light_hours_on, light_hours_off, lights_on_at, created_by)
       values ($1, $2, 'Test', current_date, 'active', 'veg', 'seed', 18, 6, '06:00', $3)`,
      [cycleId, farmId, userId],
    );
    await client.query(
      `insert into public.scopes (id, farm_id, cycle_id, display_name, scope_type)
       values ($1, $2, $3, 'Bench', 'tent')`,
      [scopeId, farmId, cycleId],
    );

    const cat = await client.query<{ id: string }>(
      `select id from public.fertilizer_products where farm_id is null limit 1`,
    );
    catalogProductId = cat.rows[0]?.id;
    expect(catalogProductId).toBeTruthy();

    await client.query(
      `insert into public.farm_fertilizer_products (id, farm_id, external_key, brand, name, created_by)
       values ($1, $2, 'test-farm-prod', 'Test', 'Farm mix', $3)`,
      [farmProductId, farmId, userId],
    );
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('creates feeding with catalog and farm doses, stage and light changes', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    const result = await createGrowCycleFeedingLog(supabase, {
      farmId,
      cycleId,
      scopeId,
      entryKind: 'feeding',
      volumeMl: 3000,
      ph: 6.1,
      doses: [
        {
          productLabel: 'Catalog A',
          amountMl: 12.5,
          fertilizerProductId: catalogProductId,
        },
        {
          productLabel: 'Farm B',
          amountMl: 8,
          farmFertilizerProductId: farmProductId,
        },
      ],
      newStage: 'preflower',
      lightHoursOn: 12,
      lightHoursOff: 12,
      lightsOnAt: '08:00',
    });

    const eventId = (result.event as { id: string }).id;
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/i);

    const ev = await db.client.query<{ source_type: string; event_type: string }>(
      `select source_type, event_type from public.events where id = $1`,
      [eventId],
    );
    expect(ev.rows[0]?.source_type).toBe('user_form');
    expect(ev.rows[0]?.event_type).toBe('feeding');

    const doses = await db.client.query<{
      fertilizer_product_id: string | null;
      farm_fertilizer_product_id: string | null;
      amount_ml: string;
      farm_id: string;
    }>(
      `select d.fertilizer_product_id, d.farm_fertilizer_product_id, d.amount_ml, d.farm_id
       from public.grow_cycle_feeding_entry_doses d
       join public.grow_cycle_feeding_entries e on e.id = d.entry_id
       where e.event_id = $1
       order by d.amount_ml desc`,
      [eventId],
    );
    expect(doses.rows).toHaveLength(2);
    expect(doses.rows[0]?.farm_id).toBe(farmId);
    expect(doses.rows.some((r) => r.fertilizer_product_id === catalogProductId)).toBe(true);
    expect(doses.rows.some((r) => r.farm_fertilizer_product_id === farmProductId)).toBe(true);

    const cycle = await db.client.query<{ stage: string; light_hours_on: number }>(
      `select stage, light_hours_on from public.grow_cycles where id = $1`,
      [cycleId],
    );
    expect(cycle.rows[0]?.stage).toBe('preflower');
    expect(cycle.rows[0]?.light_hours_on).toBe(12);

    const stageEv = await db.client.query<{ body: string }>(
      `select body from public.events where cycle_id = $1 and event_type = 'stage_changed' order by occurred_at desc limit 1`,
      [cycleId],
    );
    expect(stageEv.rows[0]?.body).toContain('предцвет');

    const lightRows = await db.client.query<{ light_hours_on: number }>(
      `select light_hours_on from public.grow_cycle_light_schedules where cycle_id = $1 order by effective_from desc limit 1`,
      [cycleId],
    );
    expect(lightRows.rows[0]?.light_hours_on).toBe(12);
  });

  it('allows backward stage on feeding log without allow_backward', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    await createGrowCycleFeedingLog(supabase, {
      farmId,
      cycleId,
      scopeId,
      entryKind: 'watering',
      volumeMl: 500,
      newStage: 'veg',
    });
    const cycle = await db.client.query<{ stage: string }>(
      `select stage from public.grow_cycles where id = $1`,
      [cycleId],
    );
    expect(cycle.rows[0]?.stage).toBe('veg');
  });
});
