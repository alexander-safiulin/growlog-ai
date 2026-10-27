import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solveMagicWand,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';
import { defaultNutrientWorkspaceProductIds } from '@/lib/nutrient/default-fertilizers';

const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');
const catalog = JSON.parse(readFileSync(bundlePath, 'utf8')) as {
  fertilizers: Array<{
    id: string;
    external_key: string;
    brand: string;
    name: string;
    physical_form: 'solid' | 'liquid';
    dose_unit: 'g_per_L' | 'ml_per_L';
    metadata: Record<string, unknown>;
    lines: Array<{ form_key: string; value_pct: number }>;
  }>;
  target_profiles: Array<{ slug: string; target_ppm: Record<string, number> }>;
};

const FE_EDTA_ID = '4219c47d-4bd4-4c83-a036-d559d6e1372a';
const MN_EDTA_ID = 'f9dc4395-53f8-4519-afff-da8852eb68f0';

function catalogFertilizerSpecs(): FertilizerSpec[] {
  const rows: DbFertilizerProductRow[] = catalog.fertilizers.map((p) => ({
    id: p.id,
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    metadata: p.metadata,
  }));
  const lines: DbCompositionLineRow[] = catalog.fertilizers.flatMap((p) =>
    p.lines.map((l) => ({ product_id: p.id, form_key: l.form_key, value_pct: l.value_pct })),
  );
  return mapDbProductsToFertilizerSpecs(rows, lines);
}

describe('solveMagicWand trace strip (micro products)', () => {
  it('keeps Fe-EDTA and Mn EDTA when selected (no macro-only strip)', () => {
    const pool = catalogFertilizerSpecs();
    const selectedIds = [...defaultNutrientWorkspaceProductIds(catalog), FE_EDTA_ID, MN_EDTA_ID];
    const fertilizers = pool.filter((f) => selectedIds.includes(f.id));
    const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
    const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;

    const result = solveMagicWand({
      target: netTarget,
      fertilizers,
      substitutePool: pool,
      options: {
        volumeL: 100,
        maxAlternatives: 4,
        tankMode: 'ab',
        stockTank: { concentrationFactor: 100, twoTankMode: true },
        model: 'canonical',
      },
    });

    const feDose = result.best.doses.find((d) => d.fertilizerId === FE_EDTA_ID)?.amountPerL ?? 0;
    expect(feDose).toBeGreaterThanOrEqual(0.01);
    const achieved = result.best.achievedPpm as Record<string, number>;
    expect(achieved.Fe ?? 0).toBeGreaterThan(1.5);
  });
});
