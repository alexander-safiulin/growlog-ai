import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresMigratedTestDb, type PostgresTestDb } from './postgres-test-db';

const MIGRATION = path.join(
  process.cwd(),
  'supabase/migrations/20261027120000_revoke_anon_farm_functions.sql',
);

const FUNCTIONS = [
  'public.user_farm_ids()',
  'public.is_farm_admin(uuid)',
  'public.is_farm_manager_or_admin(uuid)',
  'public.normalize_invite_email(text)',
  'public.farm_users_enforce_mutations()',
  'public.create_farm_invitation(uuid,text,text)',
  'public.revoke_farm_invitation(uuid)',
  'public.list_farm_invitations(uuid)',
  'public.accept_pending_invitations_for_current_user()',
  'public.list_farm_members(uuid)',
  'public.change_farm_member_role(uuid,uuid,text)',
  'public.remove_farm_member(uuid,uuid)',
];

const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const farmId = '11111111-1111-4111-8111-111111111111';

async function asRole<T>(
  db: PostgresTestDb,
  role: 'anon' | 'authenticated',
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.client.query('begin');
  try {
    await db.client.query(`select set_config('test.auth_uid', $1, true)`, [userId ?? '']);
    await db.client.query(`select set_config('test.auth_role', $1, true)`, [role]);
    await db.client.query(`set local role ${role}`);
    return await fn();
  } finally {
    await db.client.query('rollback');
  }
}

async function privileges(db: PostgresTestDb) {
  const res = await db.client.query<{ fn: string; anon: boolean; auth: boolean; svc: boolean }>(
    `select f as fn,
            has_function_privilege('anon', f::regprocedure, 'execute') as anon,
            has_function_privilege('authenticated', f::regprocedure, 'execute') as auth,
            has_function_privilege('service_role', f::regprocedure, 'execute') as svc
       from unnest($1::text[]) as f`,
    [FUNCTIONS],
  );
  return res.rows;
}

describe('revoke anon EXECUTE on farm functions', () => {
  let db: PostgresTestDb;

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = process.env.MIGRATION_TEST_USE_DOCKER ?? '1';
    db = await createPostgresMigratedTestDb();
    await db.client.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, 'admin@ogl.test', now())`, [adminId]);
    await db.client.query(`insert into public.farms (id, name, timezone) values ($1, 'OGL', 'UTC')`, [farmId]);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [farmId, adminId],
    );
    // Simulate Supabase default table privileges for API roles (RLS still applies).
    await db.client.query(
      `grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role`,
    );
  }, 180_000);

  afterAll(async () => {
    await db?.close();
  });

  it('re-applying is idempotent and closes Supabase-style direct anon grants', async () => {
    // Simulate Supabase default privileges (EXECUTE granted directly to anon and PUBLIC).
    for (const f of FUNCTIONS) {
      await db.client.query(`grant execute on function ${f} to anon, public`);
    }
    expect((await privileges(db)).every((r) => r.anon)).toBe(true);

    await db.client.query(readFileSync(MIGRATION, 'utf8'));
    await db.client.query(readFileSync(MIGRATION, 'utf8'));

    for (const row of await privileges(db)) {
      expect(row, row.fn).toMatchObject({ anon: false, auth: true, svc: true });
    }
  });

  it('anon cannot call farm RPCs or helpers', async () => {
    await expect(
      asRole(db, 'anon', null, () => db.client.query(`select public.list_farm_members($1::uuid)`, [farmId])),
    ).rejects.toThrow(/permission denied for function list_farm_members/);
    await expect(
      asRole(db, 'anon', null, () =>
        db.client.query(`select public.create_farm_invitation($1::uuid, 'x@example.com', 'grower')`, [farmId]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(db, 'anon', null, () => db.client.query(`select * from public.user_farm_ids()`)),
    ).rejects.toThrow(/permission denied for function user_farm_ids/);
  });

  it('anon public catalog reads still work (policies do not use farm helpers)', async () => {
    for (const table of ['fertilizer_products', 'nutrient_elements', 'feed_schedules', 'nutrient_catalog_recipes']) {
      await expect(
        asRole(db, 'anon', null, () => db.client.query(`select count(*) from public.${table}`)),
      ).resolves.toBeTruthy();
    }
  });

  it('authenticated keeps RPC access and RLS via user_farm_ids/is_farm_admin', async () => {
    const members = await asRole(db, 'authenticated', adminId, () =>
      db.client.query(`select * from public.list_farm_members($1::uuid)`, [farmId]),
    );
    expect(members.rows.length).toBe(1);

    const farms = await asRole(db, 'authenticated', adminId, () =>
      db.client.query(`select id from public.farms`),
    );
    expect(farms.rows.map((r) => r.id)).toEqual([farmId]);

    const isAdmin = await asRole(db, 'authenticated', adminId, () =>
      db.client.query<{ ok: boolean }>(`select public.is_farm_admin($1::uuid) as ok`, [farmId]),
    );
    expect(isAdmin.rows[0]?.ok).toBe(true);

    const invite = await asRole(db, 'authenticated', adminId, () =>
      db.client.query<{ id: string }>(
        `select public.create_farm_invitation($1::uuid, 'new@example.com', 'grower') as id`,
        [farmId],
      ),
    );
    expect(invite.rows[0]?.id).toBeTruthy();
  });

  it('farm_users trigger fires without EXECUTE for the session role', async () => {
    // Trigger functions are not EXECUTE-checked for the invoking role: revoke from a
    // RLS-bypassing role inside a rolled-back transaction and update farm_users.
    await db.client.query('begin');
    try {
      await db.client.query(
        `revoke execute on function public.farm_users_enforce_mutations() from service_role`,
      );
      await db.client.query(`set local role service_role`);
      const res = await db.client.query(
        `update public.farm_users set role = 'admin' where farm_id = $1 and user_id = $2`,
        [farmId, adminId],
      );
      expect(res.rowCount).toBe(1);
    } finally {
      await db.client.query('rollback');
    }
  });
});
