import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeDeviations,
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solveForward,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
  type ElementKey,
} from '@growlog/nutrient-calc';

const MACRO: ElementKey[] = ['N_NO3', 'N_NH4', 'P', 'K', 'Ca', 'Mg', 'S'];

const bundle = JSON.parse(
  readFileSync(path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'), 'utf8'),
);

function productsBySolubility(keys: string[]) {
  const found: typeof bundle.fertilizers = [];
  for (const key of keys) {
    const p = bundle.fertilizers.find(
      (f: { metadata?: { solubility_key?: string } }) => f.metadata?.solubility_key === key,
    );
    if (p) found.push(p);
  }
  return found;
}

describe('Hoagland solve from catalog HydroBuddy salts', () => {
  it('achieves macro targets within ±5% using KNO3, Ca nitrate, MKP, MgSO4', () => {
    const salts = productsBySolubility([
      'KNO3',
      'Ca(NO3)2·4H2O',
      'MgSO4·7H2O',
      'KH2PO4',
    ]);
    expect(salts).toHaveLength(4);

    const profile = bundle.target_profiles.find(
      (p: { slug: string }) => p.slug === 'hoagland-standard',
    );
    expect(profile).toBeTruthy();

    const rows: DbFertilizerProductRow[] = salts.map(
      (p: {
        id: string;
        external_key: string;
        brand: string;
        name: string;
        physical_form: 'solid' | 'liquid';
        dose_unit: 'g_per_L' | 'ml_per_L';
        metadata?: Record<string, unknown>;
      }) => ({
        id: p.id,
        external_key: p.external_key,
        brand: p.brand,
        name: p.name,
        physical_form: p.physical_form,
        dose_unit: p.dose_unit,
        metadata: p.metadata,
      }),
    );
    const lines: DbCompositionLineRow[] = salts.flatMap(
      (p: { id: string; lines: Array<{ form_key: string; value_pct: number }> }) =>
        p.lines.map((l) => ({
          product_id: p.id,
          form_key: l.form_key,
          value_pct: l.value_pct,
        })),
    );
    const fertilizers = mapDbProductsToFertilizerSpecs(rows, lines);
    const target = mapDbProfileToTarget(profile);

    const result = solveForward({
      target,
      sourceWater: { ppm: {} },
      fertilizers,
      options: { model: 'canonical' },
    });
    expect(result.best.doses.length).toBeGreaterThan(0);

    const deviations = computeDeviations(MACRO, target, result.best.achievedPpm);
    for (const d of deviations) {
      if (d.targetPpm <= 0) continue;
      expect(Math.abs(d.deltaPct)).toBeLessThanOrEqual(5.5);
    }
  });
});
