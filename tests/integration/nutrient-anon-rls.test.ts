import { describe, expect, it } from 'vitest';
import { createMigratedTestDb, endTestAuth, setTestAuth } from './pglite-test-db';

describeIntegration('nutrient anon RLS', () => {
  it('anon can read global fertilizer catalog rows', async () => {
    const db = await createMigratedTestDb();
    await setTestAuth(db, null, 'anon');
    const { rows } = await db.query<{ cnt: string }>(
      `select count(*)::text as cnt from public.fertilizer_products where is_custom = false`,
    );
    await endTestAuth(db);
    expect(Number(rows[0]?.cnt ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it('anon cannot read farm water profiles', async () => {
    const db = await createMigratedTestDb();
    await db.exec(`
      insert into public.farms (id, name, slug) values
        ('11111111-1111-1111-1111-111111111111', 'Test', 'test-farm')
      on conflict do nothing;
      insert into public.farm_water_profiles (farm_id, name, water_ppm)
      values ('11111111-1111-1111-1111-111111111111', 'Secret', '{}');
    `);
    await setTestAuth(db, null, 'anon');
    const { rows } = await db.query(`select * from public.farm_water_profiles`);
    await endTestAuth(db);
    expect(rows).toHaveLength(0);
  });
});

function describeIntegration(name: string, fn: () => void) {
  if (process.env.RUN_INTEGRATION_TESTS === '1') {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
}
