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

function totalElementalN(
  achieved: Record<string, number>,
  model: 'hydroodo_legacy' | 'canonical',
): number {
  if (model === 'hydroodo_legacy') return achieved.N ?? 0;
  return (achieved.N_NO3 ?? 0) + (achieved.N_NH4 ?? 0) + (achieved.N_UREA ?? 0);
}

describe('P4 manufacturer w/w liquid density (ppm ≈ % × density × 10 per mL/L)', () => {
  it('Plagron Hydro A 1 mL/L → N ≈ 37.8', () => {
    const fert = specForExternalKey('plagron|hydro-a');
    for (const model of ['hydroodo_legacy', 'canonical'] as const) {
      const { achievedPpm } = solveReverse({
        doses: [{ fertilizer: fert, amountPerL: 1 }],
        options: { model },
      });
      expect(totalElementalN(achievedPpm as Record<string, number>, model)).toBeCloseTo(37.8, 0);
    }
  });

  it('Athena Blended Grow A 1 mL/L → N ≈ 47.9', () => {
    const fert = specForExternalKey('athena|blended-grow-a');
    const { achievedPpm } = solveReverse({
      doses: [{ fertilizer: fert, amountPerL: 1 }],
      options: { model: 'canonical' },
    });
    expect(totalElementalN(achievedPpm as Record<string, number>, 'canonical')).toBeCloseTo(
      47.9,
      0,
    );
  });

  it('CANNA Coco HC A 1 mL/L → N ≈ 80.4, Ca ≈ 104.5', () => {
    const fert = specForExternalKey('canna|coco-hc-a');
    const { achievedPpm } = solveReverse({
      doses: [{ fertilizer: fert, amountPerL: 1 }],
      options: { model: 'canonical' },
    });
    const ppm = achievedPpm as Record<string, number>;
    expect(totalElementalN(ppm, 'canonical')).toBeCloseTo(80.4, 0);
    expect(ppm.Ca).toBeCloseTo(104.5, 0);
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
