import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { forwardPpmFromCatalogRecipeLines } from '@growlog/nutrient-calc';

const classicsPath = path.join(process.cwd(), 'supabase/seed/nutrient/classics.json');

const MACRO_KEYS = ['N_NO3', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

function macroActual(actual: Record<string, number>, k: string): number {
  if (k === 'N_NO3') return actual.N_NO3 ?? actual.N ?? 0;
  return actual[k] ?? 0;
}

describe('classic catalog recipes', () => {
  const classics = JSON.parse(readFileSync(classicsPath, 'utf8'));

  for (const recipe of classics.catalog_recipes) {
    it(`${recipe.slug}: forward ppm matches profile target_ppm within 5%`, () => {
      const profile = classics.profiles.find(
        (p: { slug: string }) => p.slug === recipe.profile_slug,
      );
      expect(profile).toBeDefined();
      const forward = forwardPpmFromCatalogRecipeLines(recipe.lines, 'canonical');
      for (const key of MACRO_KEYS) {
        const target = profile.target_ppm[key] ?? 0;
        if (target <= 0) continue;
        const actual = macroActual(forward, key);
        expect(Math.abs(actual - target) / target).toBeLessThanOrEqual(0.05);
      }
    });
  }

  it('flags Hydroodo N double-count products in bundle metadata', () => {
    const bundle = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'),
        'utf8',
      ),
    );
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
