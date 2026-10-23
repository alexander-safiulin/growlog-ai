import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const P5_SQL = path.join(
  process.cwd(),
  'supabase/migrations/20261023120000_adr014_p5_manufacturer_catalog.sql',
);

describe('P5 manufacturer catalog migration (non-destructive)', () => {
  it('does not delete fertilizer_products or fertilizer_composition_lines', () => {
    const sql = readFileSync(P5_SQL, 'utf8').toLowerCase();
    expect(sql).not.toMatch(/delete from public\.fertilizer_products/);
    expect(sql).not.toMatch(/delete from public\.fertilizer_composition_lines/);
  });

  it('re-points user FKs instead of dropping legacy catalog rows', () => {
    const sql = readFileSync(P5_SQL, 'utf8');
    expect(sql).toContain('catalog_deprecated');
    expect(sql).toContain('update public.farm_nutrient_favorites');
    expect(sql).toContain('update public.nutrient_recipe_doses');
  });
});
