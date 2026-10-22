import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EC_ESTIMATE_DISCLAIMER,
  HOAGLAND_NO1_EC_TOLERANCE,
  HOAGLAND_NO1_REFERENCE_EC_MS_CM,
  crcEcMsCmAt001N,
  estimateBinaryElectrolyteEcMsCm,
  estimateEcMsCm,
  estimateEcMsCmFromIons,
  forwardPpmFromCatalogRecipeLines,
} from '@growlog/nutrient-calc';

const classicsPath = path.join(process.cwd(), 'supabase/seed/nutrient/classics.json');

describe('EC LMCv2 estimate', () => {
  it('exports disclaimer string', () => {
    expect(EC_ESTIMATE_DISCLAIMER).toMatch(/estimate/i);
  });

  it('zero ions → ~0 mS/cm', () => {
    expect(estimateEcMsCm({})).toBe(0);
  });

  for (const key of ['KCl', 'NaCl', 'KNO3', 'CaCl2', 'MgCl2', 'Na2SO4']) {
    it(`${key} at 0.01 N vs CRC equivalent conductance (≤5%)`, () => {
      const ref = crcEcMsCmAt001N(key);
      const molarity = key === 'CaCl2' || key === 'MgCl2' || key === 'Na2SO4' ? 0.005 : 0.01;
      const est = estimateBinaryElectrolyteEcMsCm(key, molarity);
      expect(Math.abs(est - ref) / ref).toBeLessThanOrEqual(0.05);
    });
  }

  it('ZnSO4 at 0.01 M within 15% of LMC ideal with ion pairing', () => {
    const molarity = 0.01;
    const ideal = estimateEcMsCmFromIons(
      [{ id: 'Zn2', cMolPerL: molarity }, { id: 'SO4', cMolPerL: molarity }],
      { ionPairing: false },
    );
    const paired = estimateEcMsCmFromIons(
      [{ id: 'Zn2', cMolPerL: molarity }, { id: 'SO4', cMolPerL: molarity }],
      { ionPairing: true },
    );
    const ref = ideal * 0.55;
    expect(Math.abs(paired - ref) / ref).toBeLessThanOrEqual(0.15);
  });

  it('CuSO4 at 0.01 M within 15% of LMC ideal with ion pairing', () => {
    const molarity = 0.01;
    const ideal = estimateEcMsCmFromIons(
      [{ id: 'Cu2', cMolPerL: molarity }, { id: 'SO4', cMolPerL: molarity }],
      { ionPairing: false },
    );
    const paired = estimateEcMsCmFromIons(
      [{ id: 'Cu2', cMolPerL: molarity }, { id: 'SO4', cMolPerL: molarity }],
      { ionPairing: true },
    );
    const ref = ideal * 0.55;
    expect(Math.abs(paired - ref) / ref).toBeLessThanOrEqual(0.15);
  });

  it('Hoagland No.1 profile EC ~2.5 mS/cm ±15% (Science in Hydroponics)', () => {
    const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
      profiles: Array<{ slug: string; target_ppm: Record<string, number> }>;
    };
    const hoagland = classics.profiles.find((p) => p.slug === 'hoagland-standard')!;
    const ec = estimateEcMsCm(hoagland.target_ppm);
    const lo = HOAGLAND_NO1_REFERENCE_EC_MS_CM * (1 - HOAGLAND_NO1_EC_TOLERANCE);
    const hi = HOAGLAND_NO1_REFERENCE_EC_MS_CM * (1 + HOAGLAND_NO1_EC_TOLERANCE);
    expect(ec).toBeGreaterThanOrEqual(lo);
    expect(ec).toBeLessThanOrEqual(hi);
  });

  it('Hoagland salt forward ppm EC within same band', () => {
    const classics = JSON.parse(readFileSync(classicsPath, 'utf8')) as {
      catalog_recipes: Array<{ slug: string; lines: Array<{ dose_per_l: number; declared_pct: Record<string, number> }> }>;
    };
    const recipe = classics.catalog_recipes.find((r) => r.slug === 'hoagland-standard-salts')!;
    const forward = forwardPpmFromCatalogRecipeLines(recipe.lines, 'canonical');
    const ec = estimateEcMsCm(forward);
    const lo = HOAGLAND_NO1_REFERENCE_EC_MS_CM * (1 - HOAGLAND_NO1_EC_TOLERANCE);
    const hi = HOAGLAND_NO1_REFERENCE_EC_MS_CM * (1 + HOAGLAND_NO1_EC_TOLERANCE);
    expect(ec).toBeGreaterThanOrEqual(lo);
    expect(ec).toBeLessThanOrEqual(hi);
  });
});
