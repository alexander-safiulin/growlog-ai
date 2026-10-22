import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CRC_EQUIVALENT_CONDUCTANCE_001N,
  CRC_SALT_KEYS_001N,
  EC_ESTIMATE_DISCLAIMER,
  EC_WARNING_SULFATE_PAIRING_UNCERTAIN,
  HOAGLAND_NO1_EC_TOLERANCE,
  HOAGLAND_NO1_REFERENCE_EC_MS_CM,
  crcEcMsCmAt001N,
  estimateEcMsCm,
  estimateEcWithMeta,
  forwardPpmFromCatalogRecipeLines,
  molarityFor001N,
  ppmFromSingleSaltMolarity,
} from '@growlog/nutrient-calc';

const classicsPath = path.join(process.cwd(), 'supabase/seed/nutrient/classics.json');

const CRC_ZN_CU_001M_MS_CM = { ZnSO4: 0.849, CuSO4: 0.831 } as const;

describe('EC LMCv2 estimate', () => {
  it('exports disclaimer string', () => {
    expect(EC_ESTIMATE_DISCLAIMER).toMatch(/estimate/i);
  });

  it('zero ions → ~0 mS/cm', () => {
    expect(estimateEcMsCm({})).toBe(0);
  });

  for (const key of CRC_SALT_KEYS_001N) {
    it(`estimateEcMsCm ${key} @ 0.01 N vs CRC (≤5%)`, () => {
      const ref = crcEcMsCmAt001N(key);
      const m = molarityFor001N(key);
      const ppm = ppmFromSingleSaltMolarity(key, m);
      const est = estimateEcMsCm(ppm, { ionPairing: false });
      expect(Math.abs(est - ref) / ref).toBeLessThanOrEqual(0.05);
    });
  }

  it('CRC table spot-check KCl Λ_eq = 141.20 (published)', () => {
    expect(CRC_EQUIVALENT_CONDUCTANCE_001N.KCl.lambdaEq).toBe(141.2);
  });

  for (const saltKey of ['ZnSO4', 'CuSO4'] as const) {
    it(`${saltKey} @ 0.01 M (ion pairing): point ≤25% CRC or range + warning`, () => {
      const ref = CRC_ZN_CU_001M_MS_CM[saltKey];
      const ppm = ppmFromSingleSaltMolarity(saltKey, 0.01);
      const result = estimateEcWithMeta(ppm, { ionPairing: true });
      const relErr = Math.abs(result.ecMsCm - ref) / ref;
      if (relErr <= 0.25) {
        expect(relErr).toBeLessThanOrEqual(0.25);
      } else {
        expect(result.warnings).toContain(EC_WARNING_SULFATE_PAIRING_UNCERTAIN);
        expect(result.ecMsCmRange).toBeDefined();
        expect(result.ecMsCmRange!.low).toBeLessThanOrEqual(ref);
        expect(result.ecMsCmRange!.high).toBeGreaterThanOrEqual(ref);
      }
    });
  }

  it('ZnSO4 @ 0.01 M vs +0.1 ppm K: EC continuity <2%', () => {
    const base = ppmFromSingleSaltMolarity('ZnSO4', 0.01);
    const trace = { ...base, K: 0.1 };
    const ecBase = estimateEcMsCm(base, { ionPairing: true });
    const ecTrace = estimateEcMsCm(trace, { ionPairing: true });
    expect(Math.abs(ecTrace - ecBase) / ecBase).toBeLessThan(0.02);
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
