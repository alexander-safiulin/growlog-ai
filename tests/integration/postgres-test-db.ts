import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Client, type ClientConfig } from 'pg';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase/migrations');
const STUB = path.join(ROOT, 'supabase/test/stubs/00_supabase_stubs.sql');
const AUTH_STUB = path.join(ROOT, 'supabase/test/stubs/01_test_auth_override.sql');

export type PostgresTestDb = {
  client: Client;
  close: () => Promise<void>;
};

function canUseDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function createPostgresMigratedTestDb(): Promise<PostgresTestDb | null> {
  const require = Boolean(process.env.CI || process.env.MIGRATION_TEST_REQUIRE);
  if (!canUseDocker() && !require) return null;

  const port = 55000 + Math.floor(Math.random() * 1000);
  const password = process.env.MIGRATION_TEST_PASSWORD ?? 'growlog-test';
  const container = `growlog-feeding-test-${process.pid}`;
  const image = process.env.MIGRATION_TEST_PG_IMAGE ?? 'pgvector/pgvector:pg17';

  const run = spawnSync(
    'docker',
    [
      'run',
      '-d',
      '--name',
      container,
      '-e',
      `POSTGRES_PASSWORD=${password}`,
      '-p',
      `${port}:5432`,
      image,
    ],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) {
    if (require) throw new Error(`docker run failed: ${run.stderr}`);
    return null;
  }

  const config: ClientConfig = {
    host: '127.0.0.1',
    port,
    user: 'postgres',
    password,
    database: 'postgres',
  };

  const client = new Client(config);
  for (let i = 0; i < 60; i++) {
    try {
      await client.connect();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const execSql = async (sql: string) => {
    await client.query(sql);
  };

  await execSql(readFileSync(STUB, 'utf8'));
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of migrations) {
    await execSql(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }
  await execSql(readFileSync(AUTH_STUB, 'utf8'));

  const close = async () => {
    await client.end().catch(() => undefined);
    spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
  };

  return { client, close };
}

export async function setPostgresTestAuth(client: Client, userId: string) {
  await client.query('begin');
  await client.query(`select set_config('test.auth_uid', $1, true)`, [userId]);
  await client.query(`select set_config('test.auth_role', 'authenticated', true)`);
  await client.query('set local role authenticated');
}

export async function endPostgresTestAuth(client: Client) {
  await client.query('commit');
}
