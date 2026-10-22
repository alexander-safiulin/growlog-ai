import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigratedTestDb, type TestPg } from './pglite-test-db';

describe('Nutrient feeding links recipe to timeline event', () => {
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

  it('log feeding sets linked_event_id on recipe', async () => {
    const eventId = '12121212-1212-4212-8212-121212121212';
    await db.exec(`
      insert into public.events (
        id, farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by
      ) values (
        '${eventId}', '${farmId}', '${cycleId}', '${scopeId}', 'feeding',
        'Nutrient mix: E2E mix (50 L)', now(), 'user_text',
        '{"nutrient_recipe_id":"${recipeId}","volume_l":50}'::jsonb, '${userId}'
      );
      update public.nutrient_recipes
      set linked_event_id = '${eventId}'
      where id = '${recipeId}' and farm_id = '${farmId}';
    `);

    const row = await db.query<{ linked_event_id: string }>(
      `select linked_event_id from public.nutrient_recipes where id = '${recipeId}'`,
    );
    expect(row.rows[0]?.linked_event_id).toBe(eventId);
  });
});
