import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase/migrations');
const STUB = path.join(ROOT, 'supabase/test/stubs/00_supabase_stubs.sql');
const AUTH_STUB = path.join(ROOT, 'supabase/test/stubs/01_test_auth_override.sql');
const NUTRIENT_HELPERS = path.join(ROOT, 'supabase/test/stubs/02_nutrient_integration_helpers.sql');

export type TestPg = PGlite;

export async function createMigratedTestDb(): Promise<TestPg> {
  const db = new PGlite();
  await db.exec(readFileSync(STUB, 'utf8'));
  await db.exec(readFileSync(AUTH_STUB, 'utf8'));

  const allow = new Set([
    '20260322120000_foundation_mvp.sql',
    '20261021120000_adr014_nutrient_calculator.sql',
    '20261022170000_adr014_p5_user_workspace.sql',
  ]);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && allow.has(f))
    .sort();
  for (const file of files) {
    let sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    sql = sql.replace(/create extension if not exists [^;]+;?\s*/gi, '-- extension skipped (PGlite test)\n');
    await db.exec(sql);
    if (file === '20260322120000_foundation_mvp.sql') {
      await db.exec(readFileSync(NUTRIENT_HELPERS, 'utf8'));
    }
  }
  await db.exec(`
    alter table public.nutrient_recipes force row level security;
    alter table public.farm_nutrient_favorites force row level security;
  `);
  return db;
}

export async function setTestAuth(db: TestPg, userId: string | null, role: 'anon' | 'authenticated' = 'authenticated') {
  await db.exec('begin');
  await db.exec(`select set_config('test.auth_uid', '${userId ?? ''}', true);`);
  await db.exec(`select set_config('test.auth_role', '${role}', true);`);
  await db.exec(`set local role ${role};`);
}

export async function endTestAuth(db: TestPg) {
  await db.exec('commit');
}
