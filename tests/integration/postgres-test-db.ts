import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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

function findPgBin(name: string): string | null {
  try {
    const onPath = execSync(`command -v ${name}`, { encoding: 'utf8' }).trim();
    if (onPath) return onPath;
  } catch {
    /* not on PATH */
  }
  try {
    const versions = readdirSync('/usr/lib/postgresql').sort().reverse();
    for (const ver of versions) {
      const candidate = path.join('/usr/lib/postgresql', ver, 'bin', name);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    /* no system PostgreSQL packages */
  }
  return null;
}

type StartedPg = {
  mode: 'docker' | 'local';
  port: number;
  password: string;
  dataDir: string;
  container?: string;
  pgCtlBin?: string;
};

function startDocker(port: number, password: string): StartedPg | null {
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch {
    return null;
  }
  const container = `growlog-feeding-test-${process.pid}-${port}`;
  const image = process.env.MIGRATION_TEST_PG_IMAGE ?? 'pgvector/pgvector:pg17';
  const run = spawnSync(
    'docker',
    ['run', '-d', '--name', container, '-e', `POSTGRES_PASSWORD=${password}`, '-p', `${port}:5432`, image],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) return null;
  for (let i = 0; i < 60; i++) {
    try {
      execSync(`PGPASSWORD=${password} pg_isready -h 127.0.0.1 -p ${port} -U postgres`, { stdio: 'ignore' });
      return { mode: 'docker', port, password, dataDir: '127.0.0.1', container };
    } catch {
      spawnSync('sleep', ['1']);
    }
  }
  spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
  return null;
}

function startLocalPg(port: number): StartedPg | null {
  const initdb = findPgBin('initdb');
  const pgCtl = findPgBin('pg_ctl');
  if (!initdb || !pgCtl) return null;
  const dataDir = process.env.MIGRATION_TEST_DATA_DIR ?? `/tmp/growlog-feeding-test-${process.pid}`;
  if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  execSync(`${initdb} -D ${dataDir} -U postgres --auth-local=trust --auth-host=scram-sha-256`, { stdio: 'ignore' });
  const conf = path.join(dataDir, 'postgresql.conf');
  const hba = path.join(dataDir, 'pg_hba.conf');
  execSync(`echo "password_encryption = 'scram-sha-256'" >> ${conf}`);
  execSync(`echo "port = ${port}" >> ${conf}`);
  execSync(`echo "listen_addresses = '127.0.0.1'" >> ${conf}`);
  execSync(`echo "unix_socket_directories = '${dataDir}'" >> ${conf}`);
  execSync(`echo "host all all 127.0.0.1/32 trust" >> ${hba}`);
  execSync(`echo "host all all ::1/128 trust" >> ${hba}`);
  execSync(`${pgCtl} -D ${dataDir} -l ${path.join(dataDir, 'logfile')} start -w`, { stdio: 'ignore' });
  return { mode: 'local', port, password: 'growlog-test', dataDir, pgCtlBin: pgCtl };
}

function stopStarted(pg: StartedPg) {
  if (pg.mode === 'docker' && pg.container) {
    spawnSync('docker', ['rm', '-f', pg.container], { stdio: 'ignore' });
    return;
  }
  if (pg.pgCtlBin) {
    spawnSync(pg.pgCtlBin, ['-D', pg.dataDir, 'stop', '-m', 'fast'], { stdio: 'ignore' });
  }
  if (pg.dataDir.startsWith('/tmp/')) {
    rmSync(pg.dataDir, { recursive: true, force: true });
  }
}

export async function createPostgresMigratedTestDb(): Promise<PostgresTestDb> {
  const require = Boolean(process.env.CI || process.env.MIGRATION_TEST_REQUIRE);
  const port = Number(process.env.MIGRATION_TEST_PORT) || 55000 + Math.floor(Math.random() * 1000);
  const password = process.env.MIGRATION_TEST_PASSWORD ?? 'growlog-test';
  const useDocker = process.env.MIGRATION_TEST_USE_DOCKER ?? 'auto';

  let started: StartedPg | null = null;
  if (useDocker === '1' || useDocker === 'auto') {
    started = startDocker(port, password);
  }
  if (!started) {
    started = startLocalPg(port);
  }
  if (!started) {
    const msg = 'Postgres test requires Docker or local initdb/pg_ctl (see scripts/migration-test/run-ephemeral-migrations.sh).';
    if (require) throw new Error(msg);
    throw new Error(`${msg} Set MIGRATION_TEST_REQUIRE=1 in CI.`);
  }

  const config: ClientConfig =
    started.mode === 'local'
      ? {
          host: started.dataDir,
          port,
          user: 'postgres',
          database: 'postgres',
        }
      : {
          host: '127.0.0.1',
          port,
          user: 'postgres',
          password: started.password,
          database: 'postgres',
        };

  const client = new Client(config);
  let connected = false;
  for (let i = 0; i < 60; i++) {
    try {
      await client.connect();
      connected = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!connected) {
    stopStarted(started);
    throw new Error(`Could not connect to ephemeral Postgres on port ${port}`);
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
    stopStarted(started);
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
