import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGrowCycleFeedingLog } from '@growlog/domain';
import { createPostgresMigratedTestDb, type PostgresTestDb } from './postgres-test-db';
import { postgresSupabaseShim } from './postgres-supabase-shim';

describe('create_grow_cycle_feeding_log RPC on Postgres', () => {
  let db: PostgresTestDb | undefined;
  const userId = '44444444-4444-4444-8444-444444444444';
  const farmId = '11111111-1111-4111-8111-111111111111';
  const cycleId = '22222222-2222-4222-8222-222222222222';
  const scopeId = '33333333-3333-4333-8333-333333333333';

  beforeAll(async () => {
    try {
      db = await createPostgresMigratedTestDb();
    } catch (e) {
      if (!process.env.CI && !process.env.MIGRATION_TEST_REQUIRE) {
        console.warn('SKIP grow-cycle feeding RPC test:', e);
        return;
      }
      throw e;
    }
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
      `insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, start_material, created_by)
       values ($1, $2, 'Test', current_date, 'active', 'veg', 'seed', $3)`,
      [cycleId, farmId, userId],
    );
    await client.query(
      `insert into public.scopes (id, farm_id, cycle_id, display_name, scope_type)
       values ($1, $2, $3, 'Bench', 'tent')`,
      [scopeId, farmId, cycleId],
    );
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('creates event with source_type user_form and feeding entry row', async (ctx) => {
    if (!db) {
      ctx.skip();
      return;
    }
    const supabase = postgresSupabaseShim(db.client, userId);
    const result = await createGrowCycleFeedingLog(supabase, {
      farmId,
      cycleId,
      scopeId,
      entryKind: 'watering',
      volumeMl: 2500,
      ph: 6.2,
    });
    const eventId = (result.event as { id: string }).id;
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/i);

    const ev = await db.client.query<{ source_type: string; event_type: string }>(
      `select source_type, event_type from public.events where id = $1`,
      [eventId],
    );
    expect(ev.rows[0]?.source_type).toBe('user_form');
    expect(ev.rows[0]?.event_type).toBe('watering');

    const entry = await db.client.query<{ volume_ml: string }>(
      `select volume_ml from public.grow_cycle_feeding_entries where event_id = $1`,
      [eventId],
    );
    expect(Number(entry.rows[0]?.volume_ml)).toBe(2500);
  });
});
