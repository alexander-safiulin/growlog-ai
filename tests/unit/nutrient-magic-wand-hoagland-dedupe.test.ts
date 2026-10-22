import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectManufacturerAbPairs,
  manufacturerAbPairPlusCorrectionSubset,
  solveForward,
  fertilizerRoleEquivalenceKey,
  fertilizersShareRoleEquivalence,
  macroMatchScorePct,
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solutionHasDuplicateRoleEquivalents,
  solutionSatisfiesAbPairs,
  solutionPassesMacroDeficitGuard,
  solveMagicWand,
  wandMacroTargetsFromNet,
  wandRoleMainSourcesDiffer,
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
  target_profiles: Array<{ slug: string; target_ppm: Record<string, number>; overdose_pct?: Record<string, number> }>;
};

const MIN_DOSE = 0.01;
const REPEAT = 3;

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

function solveUiWand(target: Record<string, number>) {
  const selectedIds = defaultNutrientWorkspaceProductIds(catalog);
  const all = catalogFertilizerSpecs();
  const fertilizers = all.filter((f) => selectedIds.includes(f.id));
  expect(selectedIds.length).toBeGreaterThanOrEqual(5);
  expect(
    catalog.fertilizers.some((p) => p.external_key.toLowerCase().includes('аптечный 25%')),
  ).toBe(true);
  return solveMagicWand({
    target,
    fertilizers,
    substitutePool: all,
    options: {
      volumeL: 100,
      maxAlternatives: 8,
      tankMode: 'ab',
      stockTank: { concentrationFactor: 100, twoTankMode: true },
      model: 'canonical',
      fastSolver: false,
    },
  });
}

function assertBestOnly(result: ReturnType<typeof solveUiWand>, pool: FertilizerSpec[], netTarget: Record<string, number>) {
  expect(result.alternatives).toHaveLength(0);
  expect(result.best.doses.length).toBeGreaterThan(0);
  for (const d of result.best.doses) {
    expect(d.amountPerL).toBeGreaterThanOrEqual(MIN_DOSE);
  }
  expect(
    solutionHasDuplicateRoleEquivalents(result.best.doses, pool, 'canonical', MIN_DOSE),
  ).toBe(false);
  expect(
    solutionPassesMacroDeficitGuard(
      netTarget,
      result.best.achievedPpm as Record<string, number>,
      'canonical',
    ),
  ).toBe(true);
  expect(wandMacroTargetsFromNet(netTarget, 'canonical').K).toBeGreaterThan(0);
}

/** Default 5 + HydroBuddy K₂SO₄, MAP, Ca monobasic phosphate, Buyskie Mg nitrate, FloraDuo A+B. */
const WIDE_WORKSPACE_PRODUCT_IDS = [
  ...defaultNutrientWorkspaceProductIds(catalog),
  'd6fa069e-5acd-4255-a499-51be7d21fa60',
  '6b265c9f-7685-4c75-a707-ea7423b7f31c',
  'c7c2f344-ffc2-4b5f-a694-9e4b9b33dfce',
  '495360e5-4e90-4e69-a13c-e1f43b3d2eb4',
  '881624b3-8291-4de2-a2ac-467e0ece37da',
  'a86659d6-532c-4e1a-a4db-0f704a864a3b',
] as const;

function solveWideWand(target: Record<string, number>) {
  const all = catalogFertilizerSpecs();
  const wideIds = new Set<string>(WIDE_WORKSPACE_PRODUCT_IDS);
  const fertilizers = all.filter((f) => wideIds.has(f.id));
  expect(fertilizers.length).toBe(WIDE_WORKSPACE_PRODUCT_IDS.length);
  return solveMagicWand({
    target,
    fertilizers,
    substitutePool: all,
    options: {
      volumeL: 100,
      maxAlternatives: 3,
      tankMode: 'ab',
      stockTank: { concentrationFactor: 100, twoTankMode: true },
      model: 'canonical',
      fastSolver: false,
    },
  });
}

describe('solveMagicWand UI workspace selection (Hoagland salts + apothecary MgSO₄)', () => {
  const pool = catalogFertilizerSpecs();
  const mgCrystal = pool.find((f) => f.name === 'Сульфат Магния');
  const mgApothecary = pool.find((f) => f.name.toLowerCase().includes('аптечный 25%'));

  it('treats pharmacy and crystal magnesium sulfate as role-equivalent', () => {
    expect(mgCrystal && mgApothecary).toBeTruthy();
    expect(fertilizersShareRoleEquivalence(mgCrystal!, mgApothecary!, 'canonical')).toBe(true);
    expect(fertilizerRoleEquivalenceKey(mgCrystal!, 'canonical')).toBe(
      fertilizerRoleEquivalenceKey(mgApothecary!, 'canonical'),
    );
  });

  for (let run = 1; run <= REPEAT; run++) {
    it(`Hoagland — only best (no near-copy alternatives) run ${run}`, () => {
      const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
      const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;
      const result = solveUiWand(netTarget);
      assertBestOnly(result, pool, netTarget);
    });

    it(`K=300 — only best (no near-copy alternatives) run ${run}`, () => {
      const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
      const netTarget = { ...mapDbProfileToTarget(profile), K: 300 } as Record<string, number>;
      const result = solveUiWand(netTarget);
      assertBestOnly(result, pool, netTarget);
      expect((result.best.achievedPpm as Record<string, number>).K ?? 0).toBeGreaterThan(300 * 0.75);
    });
  }
});

const CANNA_COCO_HC_IDS = [
  '94878b57-6bc6-4891-a47d-80cff708d1c7',
  'f730eda5-3484-477e-aac8-bd6f6bdcbcb2',
] as const;

function solveCannaAbWand(target: Record<string, number>) {
  const all = catalogFertilizerSpecs();
  const selectedIds = new Set<string>([
    ...defaultNutrientWorkspaceProductIds(catalog),
    ...CANNA_COCO_HC_IDS,
  ]);
  const fertilizers = all.filter((f) => selectedIds.has(f.id));
  return solveMagicWand({
    target,
    fertilizers,
    substitutePool: all,
    options: {
      volumeL: 100,
      maxAlternatives: 3,
      tankMode: 'ab',
      stockTank: { concentrationFactor: 100, twoTankMode: true },
      model: 'canonical',
      fastSolver: false,
    },
  });
}

describe('solveMagicWand wide 11-product selection', () => {
  const pool = catalogFertilizerSpecs();

  for (let run = 1; run <= REPEAT; run++) {
    it(`Hoagland — 1–3 role-distinct alternatives run ${run}`, () => {
      const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
      const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;
      const macroTargets = wandMacroTargetsFromNet(netTarget, 'canonical');
      const result = solveWideWand(netTarget);
      expect(result.alternatives.length).toBeGreaterThanOrEqual(1);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
      for (const alt of result.alternatives) {
        expect(
          wandRoleMainSourcesDiffer(result.best, alt, pool, macroTargets, 'canonical', MIN_DOSE),
        ).toBe(true);
        expect(
          solutionPassesMacroDeficitGuard(
            netTarget,
            alt.achievedPpm as Record<string, number>,
            'canonical',
          ),
        ).toBe(true);
      }
    });

    it(`K=300 — 1–3 role-distinct alternatives run ${run}`, () => {
      const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
      const netTarget = { ...mapDbProfileToTarget(profile), K: 300 } as Record<string, number>;
      const macroTargets = wandMacroTargetsFromNet(netTarget, 'canonical');
      const result = solveWideWand(netTarget);
      expect(result.alternatives.length).toBeGreaterThanOrEqual(1);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
      for (const alt of result.alternatives) {
        expect(
          wandRoleMainSourcesDiffer(result.best, alt, pool, macroTargets, 'canonical', MIN_DOSE),
        ).toBe(true);
        expect(
          solutionPassesMacroDeficitGuard(
            netTarget,
            alt.achievedPpm as Record<string, number>,
            'canonical',
          ),
        ).toBe(true);
      }
    });
  }
});

describe('solveMagicWand CANNA Coco HC A+B (generic pair detection)', () => {
  const pool = catalogFertilizerSpecs();

  it('doses both A and B parts; ranked by descending match %', () => {
    const cocoPair = detectManufacturerAbPairs(pool).find((p) => p.partA.name.includes('Coco HC'));
    expect(cocoPair).toBeTruthy();
    const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
    const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;
    const selected = pool.filter(
      (f) =>
        defaultNutrientWorkspaceProductIds(catalog).includes(f.id) ||
        CANNA_COCO_HC_IDS.includes(f.id as (typeof CANNA_COCO_HC_IDS)[number]),
    );
    const abSubset = manufacturerAbPairPlusCorrectionSubset(selected);
    expect(abSubset).toBeTruthy();
    const forward = solveForward({
      target: netTarget,
      fertilizers: abSubset!,
      options: {
        volumeL: 100,
        tankMode: 'ab',
        stockTank: { concentrationFactor: 100, twoTankMode: true },
        model: 'canonical',
      },
    });
    expect(solutionSatisfiesAbPairs(forward.best, [cocoPair!])).toBe(true);
    const fwdA = forward.best.doses.find((d) => d.fertilizerId === cocoPair!.partA.id)?.amountPerL ?? 0;
    const fwdB = forward.best.doses.find((d) => d.fertilizerId === cocoPair!.partB.id)?.amountPerL ?? 0;
    if (fwdA >= MIN_DOSE || fwdB >= MIN_DOSE) {
      expect(fwdA).toBeGreaterThanOrEqual(MIN_DOSE);
      expect(fwdB).toBeGreaterThanOrEqual(MIN_DOSE);
    }

    const result = solveCannaAbWand(netTarget);
    const ranked = [result.best, ...result.alternatives];
    expect(result.alternatives.length).toBeLessThanOrEqual(3);
    for (const sol of ranked) {
      expect(solutionSatisfiesAbPairs(sol, [cocoPair!])).toBe(true);
      const a = sol.doses.find((d) => d.fertilizerId === cocoPair!.partA.id)?.amountPerL ?? 0;
      const b = sol.doses.find((d) => d.fertilizerId === cocoPair!.partB.id)?.amountPerL ?? 0;
      if (a >= MIN_DOSE || b >= MIN_DOSE) {
        expect(a).toBeGreaterThanOrEqual(MIN_DOSE);
        expect(b).toBeGreaterThanOrEqual(MIN_DOSE);
      }
    }
    for (let i = 1; i < ranked.length; i++) {
      const scorePrev = macroMatchScorePct(
        netTarget,
        ranked[i - 1].achievedPpm as Record<string, number>,
        'canonical',
      );
      const scoreCur = macroMatchScorePct(
        netTarget,
        ranked[i].achievedPpm as Record<string, number>,
        'canonical',
      );
      expect(scorePrev).toBeGreaterThanOrEqual(scoreCur - 0.05);
    }
  });
});

describe('solveMagicWand wide selection timing', () => {
  it('median wall time under 1000 ms (3 runs)', () => {
    const profile = catalog.target_profiles.find((p) => p.slug === 'hoagland-standard')!;
    const netTarget = mapDbProfileToTarget(profile) as Record<string, number>;
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      solveWideWand(netTarget);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    expect(samples[1]).toBeLessThan(1000);
  });
});
