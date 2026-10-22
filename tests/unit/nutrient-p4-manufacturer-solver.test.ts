import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapDbProductsToFertilizerSpecs,
  solveReverse,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
} from '@growlog/nutrient-calc';

function loadBundle() {
  return JSON.parse(
    readFileSync(
      path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'),
      'utf8',
    ),
  );
}

function specForExternalKey(externalKey: string) {
  const bundle = loadBundle();
  const p = bundle.fertilizers.find(
    (f: { external_key: string }) => f.external_key === externalKey,
  );
  if (!p) throw new Error(`missing product ${externalKey}`);
  const row: DbFertilizerProductRow = {
    id: p.id,
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    metadata: p.metadata,
  };
  const lines: DbCompositionLineRow[] = p.lines.map(
    (l: { form_key: string; value_pct: number }) => ({
      product_id: p.id,
      form_key: l.form_key,
      value_pct: l.value_pct,
    }),
  );
  return mapDbProductsToFertilizerSpecs([row], lines)[0];
}

describe('P4 manufacturer catalog solver sanity', () => {
  it('Plagron Hydro A 1 mL/L → N ≈ 32 (legacy) / N_NO3 ≈ 32 (canonical)', () => {
    const fert = specForExternalKey('plagron|hydro-a');
    expect(fert.metadata?.n_total_includes_forms).toBe(true);

    for (const model of ['hydroodo_legacy', 'canonical'] as const) {
      const { achievedPpm } = solveReverse({
        doses: [{ fertilizer: fert, amountPerL: 1 }],
        options: { model },
      });
      if (model === 'hydroodo_legacy') {
        expect(achievedPpm.N).toBeCloseTo(32, 0.5);
      } else {
        expect(achievedPpm.N_NO3).toBeCloseTo(32, 0.5);
      }
    }
  });

  it('Phosphoric acid 75% 1 mL/L → P ≈ 374 ppm', () => {
    const fert = specForExternalKey('hydrobuddy|h3po4');
    const { achievedPpm } = solveReverse({
      doses: [{ fertilizer: fert, amountPerL: 1 }],
      options: { model: 'canonical' },
    });
    expect(achievedPpm.P).toBeCloseTo(374, 0);
  });
});
