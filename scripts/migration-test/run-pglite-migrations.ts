/**
 * Apply all SQL migrations + ADR-014 seed twice using embedded PGlite (no Docker).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase/migrations');
const STUB = path.join(ROOT, 'supabase/test/stubs/00_supabase_stubs.sql');
const SEED = path.join(ROOT, 'supabase/migrations/20261021120100_adr014_nutrient_seed.sql');

async function execFile(db: PGlite, filePath: string) {
  const sql = readFileSync(filePath, 'utf8');
  await db.exec(sql);
}

async function countTable(db: PGlite, table: string): Promise<number> {
  const res = await db.query<{ count: string }>(`select count(*)::text as count from public.${table}`);
  return Number(res.rows[0]?.count ?? 0);
}

async function main() {
  const db = new PGlite();
  await execFile(db, STUB);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    await execFile(db, path.join(MIGRATIONS_DIR, file));
  }

  await execFile(db, SEED);
  await execFile(db, SEED);

  const expected: Record<string, number> = {
    fertilizer_products: 208,
    fertilizer_product_aliases: 24,
    target_solution_profiles: 33,
    feed_schedules: 42,
    nutrient_catalog_recipes: 4,
    nutrient_oxide_factors: 2,
  };

  for (const [table, want] of Object.entries(expected)) {
    const got = await countTable(db, table);
    if (got !== want) {
      throw new Error(`Expected ${table} count ${want}, got ${got}`);
    }
  }

  console.log('PGlite migration test passed.');
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
