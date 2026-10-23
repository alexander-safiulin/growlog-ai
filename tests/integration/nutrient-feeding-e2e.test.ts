import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { logFeedingFromNutrientRecipe } from '@growlog/domain';
import { createMigratedTestDb, type TestPg } from './pglite-test-db';
import { pgliteSupabaseShim } from './pglite-supabase-shim';

describe('Nutrient feeding (domain logFeedingFromNutrientRecipe)', () => {
  let db: TestPg;
  const userId = '33333333-3333-4333-8333-333333333333';
  const farmId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const cycleId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const scopeId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const recipeId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  beforeAll(async () => {
    db = await createMigratedTestDb();
    await db.exec(`insert into auth.users (id) values ('${userId}');`);
    await db.exec(`insert into public.farms (id, name, timezone) values ('${farmId}', 'E2E Farm', 'UTC');`);
    await db.exec(
      `insert into public.farm_users (farm_id, user_id, role) values ('${farmId}', '${userId}', 'admin');`,
    );
    await db.exec(`
      insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, created_by)
      values ('${cycleId}', '${farmId}', 'Cycle 1', current_date, 'active', 'veg', '${userId}');
    `);
    await db.exec(`
      insert into public.scopes (id, farm_id, cycle_id, display_name, scope_type)
      values ('${scopeId}', '${farmId}', '${cycleId}', 'Bench 1', 'zone');
    `);
    await db.exec(`
      insert into public.nutrient_recipes (id, farm_id, name, volume_l, mode, inputs, result, solver_version, created_by)
      values (
        '${recipeId}', '${farmId}', 'E2E mix', 50, 'forward', '{}',
        '{"best":{"doses":[],"achievedPpm":{},"matchScore":1,"warnings":[]},"alternatives":[]}',
        'test', '${userId}'
      );
    `);
  }, 180_000);

  afterAll(async () => {
    await db.close();
  });

  it('logFeedingFromNutrientRecipe sets linked_event_id', async () => {
    const supabase = pgliteSupabaseShim(db, userId);
    const { eventId } = await logFeedingFromNutrientRecipe(supabase, {
      farmId,
      cycleId,
      scopeId,
      recipeId,
      recipeName: 'E2E mix',
      volumeL: 50,
      userId,
    });
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/i);

    const row = await db.query<{ linked_event_id: string }>(
      `select linked_event_id from public.nutrient_recipes where id = '${recipeId}'`,
    );
    expect(row.rows[0]?.linked_event_id).toBe(eventId);

    const ev = await db.query<{ body: string; event_type: string }>(
      `select body, event_type from public.events where id = '${eventId}'`,
    );
    expect(ev.rows[0]?.event_type).toBe('feeding');
    expect(ev.rows[0]?.body).toContain('E2E mix');
  });
});
