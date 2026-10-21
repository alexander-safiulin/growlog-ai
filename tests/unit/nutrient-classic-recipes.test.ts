import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { forwardPpmFromCatalogRecipeLines } from '@growlog/nutrient-calc';

const classicsPath = path.join(process.cwd(), 'supabase/seed/nutrient/classics.json');

type ClassicProfile = {
  slug: string;
  target_ppm: Record<string, number>;
  profile_only?: boolean;
};

type ClassicRecipe = {
  slug: string;
  profile_slug: string;
  source_salt_list?: string[];
  lines: Array<{
    ingredient_label: string;
    dose_per_l: number;
    declared_pct: Record<string, number>;
  }>;
};

function macroActual(actual: Record<string, number>, k: string): number {
  if (k === 'N_NO3') return actual.N_NO3 ?? actual.N ?? 0;
  return actual[k] ?? 0;
}

describe('classic catalog recipes', () => {
  const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
    profiles: ClassicProfile[];
    catalog_recipes: ClassicRecipe[];
  };

  const profileOnly = new Set(
    classics.profiles.filter((p) => p.profile_only).map((p) => p.slug),
  );

  for (const recipe of classics.catalog_recipes) {
    it(`${recipe.slug}: ingredients ⊆ published source salt list`, () => {
      expect(recipe.source_salt_list?.length).toBeGreaterThan(0);
      const allowed = new Set(recipe.source_salt_list);
      for (const line of recipe.lines) {
        if (line.dose_per_l <= 0) continue;
        expect(allowed.has(line.ingredient_label)).toBe(true);
      }
    });

    it(`${recipe.slug}: forward ppm matches cited target_ppm in classics.json (≤5%)`, () => {
      const profile = classics.profiles.find((p) => p.slug === recipe.profile_slug);
      expect(profile).toBeDefined();
      expect(profileOnly.has(profile!.slug)).toBe(false);
      const forward = forwardPpmFromCatalogRecipeLines(
        recipe.lines.filter((l) => l.dose_per_l > 0),
        'canonical',
      );
      for (const [key, target] of Object.entries(profile!.target_ppm)) {
        if (target <= 0) continue;
        if (key.startsWith('Fe') || key === 'B' || key === 'Mn' || key === 'Zn' || key === 'Cu' || key === 'Mo') {
          continue;
        }
        const actual = macroActual(forward, key);
        expect(Math.abs(actual - target) / target).toBeLessThanOrEqual(0.05);
      }
    });
  }

  it('profile-only classics have no catalog recipe with invented salts', () => {
    const recipeProfiles = new Set(classics.catalog_recipes.map((r) => r.profile_slug));
    for (const slug of profileOnly) {
      expect(recipeProfiles.has(slug)).toBe(false);
    }
  });

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
