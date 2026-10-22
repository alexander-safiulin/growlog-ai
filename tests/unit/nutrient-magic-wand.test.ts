import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  macroMatchScorePct,
  solutionProvidesRequiredMacros,
  solveMagicWand,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
} from '@growlog/nutrient-calc';
import { defaultHoaglandSaltProductIds } from '@/lib/nutrient/default-fertilizers';

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
  target_profiles: Array<{ slug: string; target_ppm: Record<string, number>; overdose_pct?: Record<string, number> }>;
};

describe('solveMagicWand', () => {
  it('returns ranked alternatives for Hoagland salts', () => {
    const ids = defaultHoaglandSaltProductIds(catalog);
    const salts = catalog.fertilizers.filter((f) => ids.includes(f.id));
    const rows: DbFertilizerProductRow[] = salts.map((p) => ({
      id: p.id,
      external_key: p.external_key,
      brand: p.brand,
      name: p.name,
      physical_form: p.physical_form,
      dose_unit: p.dose_unit,
      metadata: p.metadata,
    }));
    const lines: DbCompositionLineRow[] = salts.flatMap((p) =>
      p.lines.map((l) => ({ product_id: p.id, form_key: l.form_key, value_pct: l.value_pct })),
    );
    const fertilizers = mapDbProductsToFertilizerSpecs(rows, lines);
    const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
    const result = solveMagicWand({
      target: mapDbProfileToTarget(profile),
      fertilizers,
      options: { volumeL: 100, maxAlternatives: 3, tankMode: 'ab', stockTank: { concentrationFactor: 100, twoTankMode: true } },
    });
    expect(result.best.doses.length).toBeGreaterThan(0);
    expect(result.best.matchScore).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeGreaterThanOrEqual(0);

    const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;
    const required = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];
    const all = [result.best, ...result.alternatives];
    for (const sol of all) {
      expect(
        solutionProvidesRequiredMacros(sol, fertilizers, required, 'canonical'),
      ).toBe(true);
    }

    const scores = all.map((sol) =>
      macroMatchScorePct(netTarget, sol.achievedPpm as Record<string, number>, 'canonical'),
    );
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1] + 0.01);
    }
    for (const sol of all) {
      const displayed = Math.round((sol.matchScore ?? 0) * 100);
      const computed = Math.round(
        macroMatchScorePct(netTarget, sol.achievedPpm as Record<string, number>, 'canonical'),
      );
      expect(displayed).toBe(computed);
    }
  });
});
