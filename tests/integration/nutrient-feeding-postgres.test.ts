import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { logFeedingFromNutrientRecipe } from '@growlog/domain';
import { createPostgresMigratedTestDb, type PostgresTestDb } from './postgres-test-db';
import { postgresSupabaseShim } from './postgres-supabase-shim';

describe('Nutrient feeding on real Postgres (migration create_log_entry)', () => {
  let db: PostgresTestDb | null = null;
  const userId = '33333333-3333-4333-8333-333333333333';
  const farmId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const cycleId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const scopeId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const recipeId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  beforeAll(async () => {
    db = await createPostgresMigratedTestDb();
    if (!db) return;

    const { client } = db;
    await client.query(`insert into auth.users (id) values ($1)`, [userId]);
    await client.query(
      `insert into public.farms (id, name, timezone) values ($1, 'Postgres E2E', 'UTC')`,
      [farmId],
    );
    await client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [farmId, userId],
    );
    await client.query(
      `insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, created_by)
       values ($1, $2, 'Cycle 1', current_date, 'active', 'veg', $3)`,
      [cycleId, farmId, userId],
    );
    await client.query(
      `insert into public.scopes (id, farm_id, cycle_id, display_name, scope_type)
       values ($1, $2, $3, 'Bench 1', 'zone')`,
      [scopeId, farmId, cycleId],
    );
    await client.query(
      `insert into public.nutrient_recipes (id, farm_id, name, volume_l, mode, inputs, result, solver_version, created_by)
       values ($1, $2, 'PG mix', 50, 'forward', '{}',
         '{"best":{"doses":[],"achievedPpm":{},"matchScore":1,"warnings":[]},"alternatives":[]}',
         'test', $3)`,
      [recipeId, farmId, userId],
    );
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('logFeedingFromNutrientRecipe uses real create_log_entry RPC', async () => {
    if (!db) {
      const require = Boolean(process.env.CI || process.env.MIGRATION_TEST_REQUIRE);
      if (require) throw new Error('Postgres test DB unavailable');
      return;
    }

    const supabase = postgresSupabaseShim(db.client, userId);
    const { eventId } = await logFeedingFromNutrientRecipe(supabase, {
      farmId,
      cycleId,
      scopeId,
      recipeId,
      recipeName: 'PG mix',
      volumeL: 50,
      userId,
    });
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/i);

    const link = await db.client.query<{ linked_event_id: string }>(
      `select linked_event_id from public.nutrient_recipes where id = $1`,
      [recipeId],
    );
    expect(link.rows[0]?.linked_event_id).toBe(eventId);

    const ev = await db.client.query<{ body: string; event_type: string }>(
      `select body, event_type from public.events where id = $1`,
      [eventId],
    );
    expect(ev.rows[0]?.event_type).toBe('feeding');
    expect(ev.rows[0]?.body).toContain('PG mix');
  });
});
