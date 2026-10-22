import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigratedTestDb, endTestAuth, setTestAuth, type TestPg } from './pglite-test-db';

describe('ADR-014 P5 RLS (PGlite)', () => {
  let db: TestPg;
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const farmA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const farmB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeAll(async () => {
    db = await createMigratedTestDb();
    await db.exec(`insert into auth.users (id) values ('${userA}'), ('${userB}');`);
    await db.exec(`
      insert into public.farms (id, name, timezone) values
        ('${farmA}', 'Farm A', 'UTC'),
        ('${farmB}', 'Farm B', 'UTC');
    `);
    await db.exec(`
      insert into public.farm_users (farm_id, user_id, role) values
        ('${farmA}', '${userA}', 'admin'),
        ('${farmB}', '${userB}', 'admin');
    `);
  }, 180_000);

  afterAll(async () => {
    await db.close();
  });

  it('member can read own farm nutrient recipes', async () => {
    await db.exec(`
      insert into public.nutrient_recipes (farm_id, name, volume_l, mode, inputs, result, solver_version, created_by)
      values ('${farmA}', 'test', 10, 'forward', '{}', '{}', 'v', '${userA}');
    `);
    await setTestAuth(db, userA);
    const res = await db.query(`select count(*)::int as c from public.nutrient_recipes where farm_id = '${farmA}'`);
    await endTestAuth(db);
    expect(res.rows[0]?.c).toBe(1);
  });

  it('cannot read another farm favorites', async () => {
    await db.exec(`
      insert into public.farm_fertilizer_products (id, farm_id, external_key, brand, name, physical_form, dose_unit)
      values ('99999999-9999-4999-8999-999999999999', '${farmB}', 'test:prod', 'T', 'P', 'solid', 'g_per_L');
      insert into public.farm_nutrient_favorites (farm_id, user_id, product_scope, farm_product_id)
      values ('${farmB}', '${userB}', 'farm', '99999999-9999-4999-8999-999999999999');
    `);
    await setTestAuth(db, userA);
    const res = await db.query<{ c: number }>(
      `select count(*)::int as c from public.farm_nutrient_favorites where farm_id = '${farmB}'`,
    );
    await endTestAuth(db);
    expect(res.rows[0]?.c).toBe(0);
  });

  it('rejects cross-farm favorite via trigger', async () => {
    const farmProductA = '88888888-8888-4888-8888-888888888888';
    await db.exec(`
      insert into public.farm_fertilizer_products (id, farm_id, external_key, brand, name, physical_form, dose_unit)
      values ('${farmProductA}', '${farmA}', 'test:a', 'T', 'A', 'solid', 'g_per_L');
    `);
    await expect(
      db.exec(`
        insert into public.farm_nutrient_favorites (farm_id, user_id, product_scope, farm_product_id)
        values ('${farmB}', '${userB}', 'farm', '${farmProductA}');
      `),
    ).rejects.toThrow();
  });

  it('cross-farm recipe insert is not visible to non-member', async () => {
    await db.exec(`
      insert into public.nutrient_recipes (farm_id, name, volume_l, mode, inputs, result, solver_version, created_by)
      values ('${farmB}', 'secret', 1, 'forward', '{}', '{}', 'v', '${userB}');
    `);
    await setTestAuth(db, userA);
    const res = await db.query<{ c: number }>(
      `select count(*)::int as c from public.nutrient_recipes where farm_id = '${farmB}'`,
    );
    await endTestAuth(db);
    expect(res.rows[0]?.c).toBe(0);
  });
});
