import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  acceptPendingInvitationsForCurrentUser,
  createFarmInvitation,
  revokeFarmInvitation,
} from '@growlog/domain';
import {
  createPostgresMigratedTestDb,
  endPostgresTestAuth,
  setPostgresTestAuth,
  type PostgresTestDb,
} from './postgres-test-db';
import { postgresSupabaseShim } from './postgres-supabase-shim';

const MIGRATION = path.join(
  process.cwd(),
  'supabase/migrations/20261026130000_farm_invitations.sql',
);

const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const inviteeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const growerId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const oglFarmId = '11111111-1111-4111-8111-111111111111';
const ownFarmId = '22222222-2222-4222-8222-222222222222';
const cycleId = '33333333-3333-4333-8333-333333333333';

async function insertUser(
  client: PostgresTestDb['client'],
  id: string,
  email: string,
  confirmed: boolean,
) {
  await client.query(
    `insert into auth.users (id, email, email_confirmed_at)
     values ($1, $2, $3)
     on conflict (id) do update set email = excluded.email, email_confirmed_at = excluded.email_confirmed_at`,
    [id, email, confirmed ? new Date().toISOString() : null],
  );
}

async function rpcRaw(
  client: PostgresTestDb['client'],
  userId: string,
  sql: string,
  params: unknown[],
) {
  await setPostgresTestAuth(client, userId);
  try {
    return await client.query(sql, params);
  } finally {
    await endPostgresTestAuth(client);
  }
}

describe('farm invitations RPC on Postgres', () => {
  let db: PostgresTestDb;

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = process.env.MIGRATION_TEST_USE_DOCKER ?? '1';
    db = await createPostgresMigratedTestDb();

    await insertUser(db.client, adminId, 'admin@ogl.test', true);
    await insertUser(db.client, inviteeId, 'invitee@example.com', true);
    await insertUser(db.client, growerId, 'grower@ogl.test', true);

    await db.client.query(
      `insert into public.farms (id, name, timezone) values ($1, 'OGL', 'UTC'), ($2, 'Own', 'UTC')`,
      [oglFarmId, ownFarmId],
    );
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values
        ($1, $3, 'admin'),
        ($2, $3, 'admin'),
        ($1, $4, 'grower')`,
      [oglFarmId, ownFarmId, adminId, growerId],
    );
    await db.client.query(
      `insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, start_material, light_hours_on, light_hours_off, lights_on_at, created_by)
       values ($1, $2, 'OGL cycle', current_date, 'active', 'veg', 'seed', 18, 6, '06:00', $3)`,
      [cycleId, oglFarmId, adminId],
    );
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [ownFarmId, inviteeId],
    );
    await db.client.query(`
      grant select on public.farms to authenticated;
      grant select on public.grow_cycles to authenticated;
      grant select on public.farm_users to authenticated;
    `);
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('admin invites unknown email; confirmed user accepts and sees farm data via RLS', async () => {
    const email = 'newmember@example.com';
    const newUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    await insertUser(db.client, newUserId, email, true);

    const shimAdmin = postgresSupabaseShim(db.client, adminId);
    const inviteId = await createFarmInvitation(shimAdmin, {
      farmId: oglFarmId,
      email,
      role: 'grower',
    });
    expect(inviteId).toMatch(/^[0-9a-f-]{36}$/i);

    const shimNew = postgresSupabaseShim(db.client, newUserId);
    const accepted = await acceptPendingInvitationsForCurrentUser(shimNew);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.farm_name).toBe('OGL');

    await setPostgresTestAuth(db.client, newUserId);
    try {
      const farms = await db.client.query<{ id: string }>(
        `select id from public.farms where is_deleted = false order by created_at`,
      );
      expect(farms.rows.some((r) => r.id === oglFarmId)).toBe(true);
      expect(farms.rows.some((r) => r.id === ownFarmId)).toBe(false);

      const cycles = await db.client.query(`select id from public.grow_cycles where farm_id = $1`, [
        oglFarmId,
      ]);
      expect(cycles.rows.length).toBeGreaterThan(0);
    } finally {
      await endPostgresTestAuth(db.client);
    }

    const second = await acceptPendingInvitationsForCurrentUser(shimNew);
    expect(second).toHaveLength(0);
  });

  it('normalizes email case and spaces on accept', async () => {
    const userId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    await insertUser(db.client, userId, '  Spaced@Example.COM  ', true);
    await rpcRaw(
      db.client,
      adminId,
      `select public.create_farm_invitation($1::uuid, $2, $3)`,
      [oglFarmId, 'spaced@example.com', 'viewer'],
    );
    const shim = postgresSupabaseShim(db.client, userId);
    const accepted = await acceptPendingInvitationsForCurrentUser(shim);
    expect(accepted).toHaveLength(1);
  });

  it('unconfirmed email does not accept', async () => {
    const userId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    await insertUser(db.client, userId, 'pending@example.com', false);
    await rpcRaw(
      db.client,
      adminId,
      `select public.create_farm_invitation($1::uuid, $2, $3)`,
      [oglFarmId, 'pending@example.com', 'grower'],
    );
    const shim = postgresSupabaseShim(db.client, userId);
    const accepted = await acceptPendingInvitationsForCurrentUser(shim);
    expect(accepted).toHaveLength(0);
  });

  it('non-admin cannot invite or revoke', async () => {
    const shimGrower = postgresSupabaseShim(db.client, growerId);
    await expect(
      createFarmInvitation(shimGrower, { farmId: oglFarmId, email: 'x@y.com', role: 'grower' }),
    ).rejects.toThrow();

    const adminShim = postgresSupabaseShim(db.client, adminId);
    const realInv = await createFarmInvitation(adminShim, {
      farmId: oglFarmId,
      email: 'revoke-block@example.com',
      role: 'grower',
    });
    await expect(revokeFarmInvitation(shimGrower, realInv)).rejects.toThrow();
  });

  it('revoked and expired invitations are not accepted', async () => {
    const userId = '10101010-1010-4101-8101-101010101010';
    await insertUser(db.client, userId, 'revoked@example.com', true);
    const adminShim = postgresSupabaseShim(db.client, adminId);
    const inv = await createFarmInvitation(adminShim, {
      farmId: oglFarmId,
      email: 'revoked@example.com',
      role: 'grower',
    });
    await rpcRaw(db.client, adminId, `select public.revoke_farm_invitation($1::uuid)`, [inv]);
    const shim = postgresSupabaseShim(db.client, userId);
    expect(await acceptPendingInvitationsForCurrentUser(shim)).toHaveLength(0);

    await db.client.query(
      `insert into public.farm_invitations (farm_id, email_normalized, role, status, expires_at)
       values ($1, 'expired@example.com', 'grower', 'pending', now() - interval '1 day')`,
      [oglFarmId],
    );
    await insertUser(db.client, '11111111-1111-4111-8111-111111111112', 'expired@example.com', true);
    const shimExp = postgresSupabaseShim(
      db.client,
      '11111111-1111-4111-8111-111111111112',
    );
    expect(await acceptPendingInvitationsForCurrentUser(shimExp)).toHaveLength(0);
  });

  it('does not downgrade existing member role on accept', async () => {
    const email = 'manager-stays@example.com';
    const userId = '12121212-1212-4121-8121-121212121212';
    await insertUser(db.client, userId, email, true);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'manager')`,
      [oglFarmId, userId],
    );
    await db.client.query(
      `insert into public.farm_invitations (farm_id, email_normalized, role, status, expires_at)
       values ($1, $2, 'viewer', 'pending', now() + interval '7 days')`,
      [oglFarmId, email],
    );
    await acceptPendingInvitationsForCurrentUser(postgresSupabaseShim(db.client, userId));
    const role = await db.client.query<{ role: string }>(
      `select role from public.farm_users where farm_id = $1 and user_id = $2`,
      [oglFarmId, userId],
    );
    expect(role.rows[0]?.role).toBe('manager');
  });

  it('last admin cannot leave or demote', async () => {
    const soloAdminFarm = '13131313-1313-4131-8131-131313131313';
    const soloAdmin = '14141414-1414-4141-8141-141414141414';
    await insertUser(db.client, soloAdmin, 'solo@example.com', true);
    await db.client.query(`insert into public.farms (id, name, timezone) values ($1, 'Solo', 'UTC')`, [
      soloAdminFarm,
    ]);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [soloAdminFarm, soloAdmin],
    );

    await expect(
      rpcRaw(db.client, soloAdmin, `select public.remove_farm_member($1::uuid, $2::uuid)`, [
        soloAdminFarm,
        soloAdmin,
      ]),
    ).rejects.toThrow(/last_admin/i);

    await expect(
      rpcRaw(db.client, soloAdmin, `select public.change_farm_member_role($1::uuid, $2::uuid, $3)`, [
        soloAdminFarm,
        soloAdmin,
        'grower',
      ]),
    ).rejects.toThrow(/last_admin/i);
  });

  it('farm deletion cascade removes memberships without last_admin error', async () => {
    const farmId = '15151515-1515-4151-8151-151515151515';
    const user = '16161616-1616-4161-8161-161616161616';
    await insertUser(db.client, user, 'cascade@example.com', true);
    await db.client.query(`insert into public.farms (id, name, timezone) values ($1, 'Tmp', 'UTC')`, [
      farmId,
    ]);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [farmId, user],
    );
    await db.client.query('reset role');
    await db.client.query(`delete from public.farms where id = $1`, [farmId]);
    const left = await db.client.query(`select 1 from public.farm_users where farm_id = $1`, [farmId]);
    expect(left.rows).toHaveLength(0);
  });

  it('user deletion cascade removes membership', async () => {
    const farmId = '17171717-1717-4171-8171-171717171717';
    const user = '18181818-1818-4181-8181-181818181818';
    await insertUser(db.client, user, 'gone@example.com', true);
    await db.client.query(`insert into public.farms (id, name, timezone) values ($1, 'Stay', 'UTC')`, [
      farmId,
    ]);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'grower')`,
      [farmId, user],
    );
    await db.client.query('reset role');
    await db.client.query(`delete from auth.users where id = $1`, [user]);
    const left = await db.client.query(`select 1 from public.farm_users where user_id = $1`, [user]);
    expect(left.rows).toHaveLength(0);
  });

  it('non-manager cannot list invitations', async () => {
    const viewerId = '19191919-1919-4191-8191-191919191919';
    await insertUser(db.client, viewerId, 'viewer@example.com', true);
    await db.client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'viewer')`,
      [oglFarmId, viewerId],
    );
    await expect(
      rpcRaw(db.client, viewerId, `select * from public.list_farm_invitations($1::uuid)`, [oglFarmId]),
    ).rejects.toThrow(/Not authorized/i);
  });
});

describe('farm invitations migration idempotent', () => {
  it('applies 20261026130000 twice without error', async () => {
    const db = await createPostgresMigratedTestDb();
    const sql = readFileSync(MIGRATION, 'utf8');
    await db.client.query(sql);
    await db.client.query(sql);
    const res = await db.client.query<{ regclass: string }>(
      `select 'public.farm_invitations'::regclass`,
    );
    expect(res.rows[0]?.regclass).toBe('farm_invitations');
    await db.close();
  }, 300_000);
});
