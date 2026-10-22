import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  macroMatchScorePct,
  fertilizerCompositionSignature,
  solutionCanonicalDoseKey,
  solveMagicWand,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
  type FertilizerSpec,
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

/** Matches web `useNutrientSolve` for default Hoagland workspace selection. */
function solveDefaultHoaglandUiWand() {
  const selectedIds = defaultHoaglandSaltProductIds(catalog);
  const all = catalogFertilizerSpecs();
  const fertilizers = all.filter((f) => selectedIds.includes(f.id));
  const substitutePool = all;
  const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
  return {
    result: solveMagicWand({
      target: mapDbProfileToTarget(profile),
      fertilizers,
      substitutePool,
      options: {
        volumeL: 100,
        maxAlternatives: 8,
        tankMode: 'ab',
        stockTank: { concentrationFactor: 100, twoTankMode: true },
        model: 'canonical',
        fastSolver: false,
      },
    }),
    pool: all,
    profile,
  };
}

describe('solveMagicWand Hoagland UI dedupe', () => {
  it('drops near-identical alternatives (same composition signature doses, ≤1% score)', () => {
    const { result, pool, profile } = solveDefaultHoaglandUiWand();
    const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;
    const solutions = [result.best, ...result.alternatives];

    const canonicalKeys = solutions.map((s) => solutionCanonicalDoseKey(s, pool));
    expect(new Set(canonicalKeys).size).toBe(canonicalKeys.length);

    for (let i = 0; i < solutions.length; i++) {
      for (let j = i + 1; j < solutions.length; j++) {
        const scoreI = macroMatchScorePct(
          netTarget,
          solutions[i].achievedPpm as Record<string, number>,
          'canonical',
        );
        const scoreJ = macroMatchScorePct(
          netTarget,
          solutions[j].achievedPpm as Record<string, number>,
          'canonical',
        );
        if (Math.abs(scoreI - scoreJ) <= 1) {
          expect(canonicalKeys[i]).not.toBe(canonicalKeys[j]);
        }
      }
    }

    const mgSigs = new Set(
      pool
        .filter((f) => fertilizerCompositionSignature(f).includes('Mg'))
        .map((f) => f.id),
    );
    const mgOnlySwaps = solutions.filter((sol) => {
      const active = sol.doses.filter((d) => d.amountPerL >= 0.01).map((d) => d.fertilizerId);
      const mgIds = active.filter((id) => mgSigs.has(id));
      return mgIds.length === 1;
    });
    const mgCanonical = mgOnlySwaps.map((s) => solutionCanonicalDoseKey(s, pool));
    expect(new Set(mgCanonical).size).toBe(mgCanonical.length);
  });
});
