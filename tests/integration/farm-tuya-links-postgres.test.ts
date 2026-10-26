import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPostgresMigratedTestDb,
  endPostgresTestAuth,
  setPostgresTestAuth,
  type PostgresTestDb,
} from './postgres-test-db';

describe('farm_tuya_links RLS on Postgres', () => {
  let db: PostgresTestDb;
  const adminA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const adminB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const growerA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const farmA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const farmB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const sharedUid = 'uid-ogl-shared';

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = '1';
    db = await createPostgresMigratedTestDb();
    const { client } = db;
    await client.query(`insert into auth.users (id) values ($1), ($2), ($3)`, [
      adminA,
      adminB,
      growerA,
    ]);
    await client.query(
      `insert into public.farms (id, name, timezone) values ($1, 'Farm A', 'UTC'), ($2, 'Farm B', 'UTC')`,
      [farmA, farmB],
    );
    await client.query(
      `insert into public.farm_users (farm_id, user_id, role) values
        ($1, $2, 'admin'),
        ($1, $3, 'grower'),
        ($4, $5, 'admin')`,
      [farmA, adminA, growerA, farmB, adminB],
    );
    await client.query(
      `insert into public.farm_tuya_links (farm_id, tuya_uid) values ($1, $2)`,
      [farmA, sharedUid],
    );
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('lets farm members read links but not insert or delete', async () => {
    const { client } = db;

    await setPostgresTestAuth(client, growerA);
    const read = await client.query<{ tuya_uid: string }>(
      `select tuya_uid from public.farm_tuya_links where farm_id = $1`,
      [farmA],
    );
    expect(read.rows.map((r) => r.tuya_uid)).toContain(sharedUid);

    await expect(
      client.query(`insert into public.farm_tuya_links (farm_id, tuya_uid) values ($1, 'uid-x')`, [
        farmA,
      ]),
    ).rejects.toThrow();
    await endPostgresTestAuth(client);

    await setPostgresTestAuth(client, adminB);
    await expect(
      client.query(`insert into public.farm_tuya_links (farm_id, tuya_uid) values ($1, $2)`, [
        farmB,
        sharedUid,
      ]),
    ).rejects.toThrow();
    await endPostgresTestAuth(client);
  });

  it('rejects duplicate tuya_uid on another farm at the database level', async () => {
    const { client } = db;
    await expect(
      client.query(`insert into public.farm_tuya_links (farm_id, tuya_uid) values ($1, $2)`, [
        farmB,
        sharedUid,
      ]),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it('rejects farm_tuya_devices when uid is not linked on the same farm', async () => {
    const { client } = db;
    await expect(
      client.query(
        `insert into public.farm_tuya_devices (farm_id, tuya_uid, tuya_device_id) values ($1, 'missing-uid', 'dev-1')`,
        [farmA],
      ),
    ).rejects.toThrow(/farm_tuya_device_uid_not_linked/i);
  });

  it('does not expose another farm links to members of farm A only', async () => {
    const { client } = db;
    await client.query(
      `insert into public.farm_tuya_links (farm_id, tuya_uid) values ($1, 'uid-farm-b-only')`,
      [farmB],
    );

    await setPostgresTestAuth(client, growerA);
    const read = await client.query(`select tuya_uid from public.farm_tuya_links`);
    expect(read.rows.map((r) => r.tuya_uid)).not.toContain('uid-farm-b-only');
    await endPostgresTestAuth(client);
  });
});
