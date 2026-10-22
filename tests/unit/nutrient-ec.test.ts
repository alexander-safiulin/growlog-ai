import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EC_ESTIMATE_DISCLAIMER,
  estimateEcMsCm,
  forwardPpmFromCatalogRecipeLines,
  ionicStrengthMolPerL,
  elementalPpmToIons,
} from '@growlog/nutrient-calc';

const classicsPath = path.join(process.cwd(), 'supabase/seed/nutrient/classics.json');

describe('EC LMCv2 estimate', () => {
  it('exports disclaimer string', () => {
    expect(EC_ESTIMATE_DISCLAIMER).toMatch(/estimate/i);
  });

  it('zero ions → ~0 mS/cm', () => {
    expect(estimateEcMsCm({})).toBe(0);
  });

  it('ionic strength increases with divalent ions', () => {
    const mono = elementalPpmToIons({ K: 100 });
    const di = elementalPpmToIons({ Ca: 100 });
    expect(ionicStrengthMolPerL(di)).toBeGreaterThan(ionicStrengthMolPerL(mono));
  });

  it('Hoagland profile ppm band matches published order of magnitude (1.5–3.0 mS/cm)', () => {
    const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
      profiles: Array<{ slug: string; target_ppm: Record<string, number> }>;
    };
    const hoagland = classics.profiles.find((p) => p.slug === 'hoagland-standard')!;
    const ec = estimateEcMsCm(hoagland.target_ppm);
    expect(ec).toBeGreaterThanOrEqual(1.5);
    expect(ec).toBeLessThanOrEqual(3.0);
  });

  it('Long Ashton profile EC within 1.4–3.2 mS/cm band', () => {
    const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
      profiles: Array<{ slug: string; target_ppm: Record<string, number> }>;
    };
    const la = classics.profiles.find((p) => p.slug === 'long-ashton')!;
    const ec = estimateEcMsCm(la.target_ppm);
    expect(ec).toBeGreaterThanOrEqual(1.4);
    expect(ec).toBeLessThanOrEqual(3.2);
  });

  it('Hoagland salt recipe forward ppm EC consistent with profile target', () => {
    const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
      catalog_recipes: Array<{ slug: string; lines: Array<{ dose_per_l: number; declared_pct: Record<string, number> }> }>;
    };
    const recipe = classics.catalog_recipes.find((r) => r.slug === 'hoagland-standard-salts')!;
    const forward = forwardPpmFromCatalogRecipeLines(recipe.lines, 'canonical');
    const ecFromSalts = estimateEcMsCm(forward);
    expect(ecFromSalts).toBeGreaterThanOrEqual(1.5);
    expect(ecFromSalts).toBeLessThanOrEqual(3.2);
  });
});
