import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solveCapAware,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
} from '@growlog/nutrient-calc';

const bundlePath = path.join(
  process.cwd(),
  'supabase/seed/nutrient/adr014-catalog.bundle.json',
);

describe('nutrient catalog DB shape → calculator', () => {
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

  it('maps products and solves a small forward case from DB rows', () => {
    const products: DbFertilizerProductRow[] = bundle.fertilizers.slice(0, 4).map(
      (p: {
        id: string;
        external_key: string;
        brand: string;
        name: string;
        physical_form: 'solid' | 'liquid';
        dose_unit: 'g_per_L' | 'ml_per_L';
      }) => ({
        id: p.id,
        external_key: p.external_key,
        brand: p.brand,
        name: p.name,
        physical_form: p.physical_form,
        dose_unit: p.dose_unit,
      }),
    );
    const lines: DbCompositionLineRow[] = bundle.fertilizers
      .slice(0, 4)
      .flatMap(
        (p: {
          id: string;
          lines: Array<{ form_key: string; value_pct: number }>;
        }) =>
          p.lines.map((line) => ({
            product_id: p.id,
            form_key: line.form_key,
            value_pct: line.value_pct,
          })),
      );

    const ferts = mapDbProductsToFertilizerSpecs(products, lines);
    expect(ferts).toHaveLength(4);
    expect(Object.keys(ferts[0].declaredPct).length).toBeGreaterThan(0);

    const profile = bundle.target_profiles.find(
      (p: { slug: string }) => p.slug.startsWith('hydroodo-olk'),
    );
    expect(profile).toBeDefined();
    const target = mapDbProfileToTarget(profile);
    const result = solveCapAware(ferts, target, 'hydroodo_legacy', {
      overdosePctByGroup: profile.overdose_pct,
    });
    expect(result.x.some((d) => d > 0)).toBe(true);
    expect(result.warnings).not.toContain('infeasible_best_effort');
  });
});
