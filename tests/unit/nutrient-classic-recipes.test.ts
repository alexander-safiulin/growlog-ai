import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { forwardPpmFromCatalogRecipeLines } from '@growlog/nutrient-calc';

const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');

describe('classic catalog recipes', () => {
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

  for (const recipe of bundle.catalog_recipes) {
    it(`${recipe.slug}: calculator reproduces published macro ppm`, () => {
      const expected = recipe.metadata.published_ppm_macros as Record<string, number>;
      const forward = forwardPpmFromCatalogRecipeLines(recipe.lines, 'canonical');
      for (const [key, target] of Object.entries(expected)) {
        if ((target ?? 0) <= 0) continue;
        const actual = forward[key] ?? 0;
        expect(Math.abs(actual - target) / target).toBeLessThanOrEqual(0.01);
      }
    });
  }

  it('flags Hydroodo N double-count products in bundle metadata', () => {
    const flagged = bundle.fertilizers.filter(
      (p: { metadata?: { n_total_includes_forms?: boolean } }) =>
        p.metadata?.n_total_includes_forms,
    );
    const keys = flagged.map((p: { external_key: string }) => p.external_key);
    expect(keys).toContain('asb greenworld|spezialdunger geranien');
    expect(keys).toContain('biobizz|bio-bloom');
    expect(keys).toContain('ghe (general hydroponics) france|floraduo bloom');
  });
});
