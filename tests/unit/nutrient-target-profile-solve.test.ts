import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  reproduceClassicRecipeFromSalts,
  solveForwardToTargetProfile,
  targetPpmFromDbProfile,
  fertilizerSpecsFromCatalogSaltLines,
  type DbTargetProfileRow,
} from '@growlog/nutrient-calc';

const classicsPath = path.join(process.cwd(), 'supabase/seed/nutrient/classics.json');

describe('catalog target profile solve', () => {
  const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
    profiles: DbTargetProfileRow[];
    catalog_recipes: Array<{
      slug: string;
      profile_slug: string;
      lines: Array<{
        ingredient_label: string;
        dose_per_l: number;
        declared_pct: Record<string, number>;
      }>;
    }>;
  };

  it('maps DB profile to target ppm', () => {
    const p = classics.profiles.find((x) => x.slug === 'hoagland-standard')!;
    const t = targetPpmFromDbProfile(p);
    expect(t.N_NO3).toBe(210);
  });

  for (const slug of ['hoagland-standard-salts', 'long-ashton-salts']) {
    it(`${slug}: reproduceClassicRecipeFromSalts within 5% macros`, () => {
      const recipe = classics.catalog_recipes.find((r) => r.slug === slug)!;
      const profile = classics.profiles.find((p) => p.slug === recipe.profile_slug)!;
      const result = reproduceClassicRecipeFromSalts({
        profile,
        lines: recipe.lines,
      });
      expect(result.withinTolerance).toBe(true);
    });
  }

  it('solveForwardToTargetProfile uses catalog fertilizers when salts provided', () => {
    const recipe = classics.catalog_recipes.find((r) => r.slug === 'hoagland-standard-salts')!;
    const profile = classics.profiles.find((p) => p.slug === recipe.profile_slug)!;
    const ferts = fertilizerSpecsFromCatalogSaltLines(recipe.lines);
    const solved = solveForwardToTargetProfile({
      profile,
      fertilizers: ferts,
      options: { model: 'canonical', overdosePctByGroup: { N_NO3: 20, P: 20, K: 20, Ca: 30, Mg: 30, S: 30 } },
    });
    expect(solved.best.doses.length).toBeGreaterThan(0);
    expect(solved.best.ecEstimateMsCm).toBeGreaterThan(0);
  });
});
