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

const MACRO_KEYS = ['N_NO3', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

function macroActual(achieved: Record<string, number>, key: string): number {
  if (key === 'N_NO3') return achieved.N_NO3 ?? achieved.N ?? 0;
  return achieved[key] ?? 0;
}

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

  for (const slug of ['hoagland-standard-salts', 'long-ashton-salts']) {
    it(`${slug}: forward solve macros within 5% of profile`, () => {
      const recipe = classics.catalog_recipes.find((r) => r.slug === slug)!;
      const profile = classics.profiles.find((p) => p.slug === recipe.profile_slug)!;
      const target = targetPpmFromDbProfile(profile);
      const ferts = fertilizerSpecsFromCatalogSaltLines(recipe.lines);
      const solved = solveForwardToTargetProfile({
        profile,
        fertilizers: ferts,
        options: {
          model: 'canonical',
          fastSolver: true,
          overdosePctByGroup: {
            N_NO3: 20,
            P: 20,
            K: 20,
            Ca: 30,
            Mg: 30,
            S: 30,
          },
        },
      });
      for (const key of MACRO_KEYS) {
        const t = target[key] ?? 0;
        if (t <= 0) continue;
        const a = macroActual(solved.best.achievedPpm as Record<string, number>, key);
        expect(Math.abs(a - t) / t).toBeLessThanOrEqual(0.05);
      }
    });

    it(`${slug}: reproduceClassicRecipeFromSalts within 5% macros`, () => {
      const recipe = classics.catalog_recipes.find((r) => r.slug === slug)!;
      const profile = classics.profiles.find((p) => p.slug === recipe.profile_slug)!;
      const result = reproduceClassicRecipeFromSalts({ profile, lines: recipe.lines });
      expect(result.withinTolerance).toBe(true);
    });
  }

  it('solveForwardToTargetProfile median <500 ms after warmup', () => {
    const recipe = classics.catalog_recipes.find((r) => r.slug === 'hoagland-standard-salts')!;
    const profile = classics.profiles.find((p) => p.slug === recipe.profile_slug)!;
    const ferts = fertilizerSpecsFromCatalogSaltLines(recipe.lines);
    const input = {
      profile,
      fertilizers: ferts,
      options: {
        model: 'canonical' as const,
        fastSolver: true,
        overdosePctByGroup: { N_NO3: 20, P: 20, K: 20, Ca: 30, Mg: 30, S: 30 },
      },
    };
    solveForwardToTargetProfile(input);
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      solveForwardToTargetProfile(input);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    expect(samples[2]).toBeLessThan(500);
  });
});
