import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMigratedTestDb } from './pglite-test-db';

const P5 = path.join(process.cwd(), 'supabase/migrations/20261022170000_adr014_p5_user_workspace.sql');

describe('ADR-014 P5 migration idempotent', () => {
  it('applies 20261022170000 twice without error', async () => {
    const db = await createMigratedTestDb();
    const sql = readFileSync(P5, 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const res = await db.query<{ regtype: string }>(
      `select 'recipe'::public.nutrient_solution_kind as regtype`,
    );
    expect(res.rows[0]?.regtype).toBe('recipe');
    await db.close();
  }, 180_000);
});
