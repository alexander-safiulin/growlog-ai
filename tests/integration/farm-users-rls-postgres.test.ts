import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPostgresMigratedTestDb,
  endPostgresTestAuth,
  setPostgresTestAuth,
  type PostgresTestDb,
} from './postgres-test-db';

const MIGRATION = path.join(
  process.cwd(),
  'supabase/migrations/20261027130000_fix_farm_users_rls_recursion.sql',
);

const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const growerId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const viewerId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const farmId = '11111111-1111-4111-8111-111111111111';

async function insertUser(client: PostgresTestDb['client'], id: string) {
  await client.query(`insert into auth.users (id) values ($1) on conflict (id) do nothing`, [id]);
}

async function asAuthenticated<T>(
  client: PostgresTestDb['client'],
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await setPostgresTestAuth(client, userId);
  try {
    return await fn();
  } finally {
    await endPostgresTestAuth(client);
  }
}

describe('farm_users RLS direct mutations on Postgres', () => {
  let db: PostgresTestDb;

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = process.env.MIGRATION_TEST_USE_DOCKER ?? '1';
    db = await createPostgresMigratedTestDb();

    await insertUser(db.client, adminId);
    await insertUser(db.client, growerId);
    await insertUser(db.client, viewerId);

    await db.client.query(`insert into public.farms (id, name, timezone) values ($1, 'RLS farm', 'UTC')`, [
      farmId,
    ]);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values
        ($1, $2, 'admin'),
        ($1, $3, 'grower'),
        ($1, $4, 'viewer')`,
      [farmId, adminId, growerId, viewerId],
    );
    await db.client.query(`
      grant select, update, delete on public.farm_users to authenticated;
    `);
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('admin can update another member without infinite recursion', async () => {
    const res = await asAuthenticated(db.client, adminId, () =>
      db.client.query(
        `update public.farm_users
            set display_name = 'Renamed grower'
          where farm_id = $1 and user_id = $2
        returning user_id`,
        [farmId, growerId],
      ),
    );
    expect(res.rowCount).toBe(1);
  });

  it('admin can delete another member without infinite recursion', async () => {
    const res = await asAuthenticated(db.client, adminId, () =>
      db.client.query(`delete from public.farm_users where farm_id = $1 and user_id = $2 returning user_id`, [
        farmId,
        viewerId,
      ]),
    );
    expect(res.rowCount).toBe(1);
  });

  it('non-admin cannot update or delete other members', async () => {
    const updateRes = await asAuthenticated(db.client, growerId, () =>
      db.client.query(
        `update public.farm_users set display_name = 'Hacked' where farm_id = $1 and user_id = $2`,
        [farmId, adminId],
      ),
    );
    expect(updateRes.rowCount).toBe(0);

    const deleteRes = await asAuthenticated(db.client, growerId, () =>
      db.client.query(`delete from public.farm_users where farm_id = $1 and user_id = $2`, [farmId, adminId]),
    );
    expect(deleteRes.rowCount).toBe(0);
  });

  it('members can still select farm_users for their farm', async () => {
    const res = await asAuthenticated(db.client, growerId, () =>
      db.client.query(
        `select user_id, role from public.farm_users where farm_id = $1 order by user_id`,
        [farmId],
      ),
    );
    const ids = res.rows.map((r) => r.user_id as string);
    expect(ids).toContain(adminId);
    expect(ids).toContain(growerId);
    expect(ids).not.toContain(viewerId);
  });
});

describe('farm_users RLS recursion fix migration idempotent', () => {
  it('applies 20261027130000 twice without error', async () => {
    const testDb = await createPostgresMigratedTestDb();
    const sql = readFileSync(MIGRATION, 'utf8');
    await testDb.client.query(sql);
    await testDb.client.query(sql);
    const policies = await testDb.client.query<{ polname: string }>(
      `select polname from pg_policy p
         join pg_class c on c.oid = p.polrelid
        where c.relname = 'farm_users'
          and polname in ('farm_users_update', 'farm_users_delete')`,
    );
    expect(policies.rows.map((r) => r.polname).sort()).toEqual(['farm_users_delete', 'farm_users_update']);
    await testDb.close();
  }, 300_000);
});
