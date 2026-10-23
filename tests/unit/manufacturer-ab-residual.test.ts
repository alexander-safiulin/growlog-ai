import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectManufacturerAbPairs,
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  manufacturerAbReferencePartADoseGPerL,
  solveManufacturerAbPairAtPartADose,
  solutionPassesMacroGuard,
  solveMagicWand,
  WAND_AB_DOSE_FRACTIONS,
  macroMatchScorePct,
  anchoredManufacturerAbPartADoseGPerL,
  fertilizerRoleEquivalenceKey,
} from '@growlog/nutrient-calc';
import { stableSortFertilizers } from '../../packages/nutrient-calc/src/matrix';
import { prepareTargetWithSourceWater } from '../../packages/nutrient-calc/src/source-water';
import { defaultNutrientWorkspaceProductIds } from '@/lib/nutrient/default-fertilizers';

const catalog = JSON.parse(
  readFileSync(path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'), 'utf8'),
);

function poolSpecs() {
  const rows = catalog.fertilizers.map((p: { id: string; external_key: string; brand: string; name: string; physical_form: string; dose_unit: string; metadata: Record<string, unknown> }) => ({
    id: p.id,
    external_key: p.external_key,
    brand: p.brand,
    name: p.name,
    physical_form: p.physical_form,
    dose_unit: p.dose_unit,
    metadata: p.metadata,
  }));
  const lines = catalog.fertilizers.flatMap((p: { id: string; lines: Array<{ form_key: string; value_pct: number }> }) =>
    p.lines.map((l) => ({ product_id: p.id, form_key: l.form_key, value_pct: l.value_pct })),
  );
  return mapDbProductsToFertilizerSpecs(rows, lines);
}

describe('manufacturer A+B residual correction solve', () => {
  it('finds a passing Coco HC dose on Hoagland', () => {
    const pool = poolSpecs();
    const profile = catalog.target_profiles.find((p: { slug: string }) => p.slug === 'hoagland-standard');
    const netTarget = mapDbProfileToTarget(profile);
    const prep = prepareTargetWithSourceWater(netTarget, { ppm: {} }, {});
    const CANNA = ['94878b57-6bc6-4891-a47d-80cff708d1c7', 'f730eda5-3484-477e-aac8-bd6f6bdcbcb2'];
    const ids = new Set([...defaultNutrientWorkspaceProductIds(catalog), ...CANNA]);
    const fertilizers = pool.filter((f) => ids.has(f.id));
    const pair = detectManufacturerAbPairs(pool).find((p) => p.partA.name.includes('Coco HC'))!;
    const linked = new Set([pair.partA.id, pair.partB.id]);
    const corrections = fertilizers.filter((f) => !linked.has(f.id));
    const abCtx = {
      netTarget: prep.netTarget as Record<string, number>,
      fullTarget: netTarget as Record<string, number>,
      water: prep.effectiveWaterPpm as Record<string, number>,
      model: 'canonical' as const,
      options: { fastSolver: true },
    };
    const labelRef = manufacturerAbReferencePartADoseGPerL(pair, abCtx.netTarget, 'canonical');
    const dedupe = (products: typeof corrections) =>
      stableSortFertilizers(products).filter((f, _i, arr) => {
        const k = fertilizerRoleEquivalenceKey(f, 'canonical');
        const firstIdx = arr.findIndex((x) => fertilizerRoleEquivalenceKey(x, 'canonical') === k);
        return arr.indexOf(f) === firstIdx;
      });
    const deduped = dedupe(corrections);
    let best: { frac: number; score: number } | null = null;
    for (const frac of WAND_AB_DOSE_FRACTIONS) {
      const sol = solveManufacturerAbPairAtPartADose(deduped, pair, labelRef * frac, abCtx);
      expect(sol).toBeTruthy();
      const ach = sol!.achievedPpm as Record<string, number>;
      if (!solutionPassesMacroGuard(abCtx.netTarget, ach, 'canonical')) continue;
      const score = macroMatchScorePct(abCtx.netTarget, ach, 'canonical');
      if (!best || score > best.score) best = { frac, score };
    }
    expect(best).toBeTruthy();
    expect(best!.score).toBeGreaterThan(75);
  });

  it('surfaces Coco HC as a ranked wand option', () => {
    const pool = poolSpecs();
    const profile = catalog.target_profiles.find((p: { slug: string }) => p.slug === 'hoagland-standard');
    const netTarget = mapDbProfileToTarget(profile);
    const CANNA = ['94878b57-6bc6-4891-a47d-80cff708d1c7', 'f730eda5-3484-477e-aac8-bd6f6bdcbcb2'];
    const ids = new Set([...defaultNutrientWorkspaceProductIds(catalog), ...CANNA]);
    const fertilizers = pool.filter((f) => ids.has(f.id));
    const pair = detectManufacturerAbPairs(pool).find((p) => p.partA.name.includes('Coco HC'))!;
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
        fastSolver: false,
      },
    });
    const anchor = anchoredManufacturerAbPartADoseGPerL(pair, netTarget, 'canonical');
    const ranked = [result.best, ...result.alternatives];
    const option = ranked.find((sol) => {
      const a = sol.doses.find((d) => d.fertilizerId === pair.partA.id)?.amountPerL ?? 0;
      const b = sol.doses.find((d) => d.fertilizerId === pair.partB.id)?.amountPerL ?? 0;
      return a >= 0.01 && b >= 0.01 && a >= anchor * 0.9;
    });
    expect(option).toBeTruthy();
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('surfaces FloraDuo as a ranked wand option (wide workspace)', () => {
    const pool = poolSpecs();
    const profile = catalog.target_profiles.find((p: { slug: string }) => p.slug === 'hoagland-standard');
    const netTarget = mapDbProfileToTarget(profile);
    const WIDE = [
      ...defaultNutrientWorkspaceProductIds(catalog),
      'd6fa069e-5acd-4255-a499-51be7d21fa60',
      '6b265c9f-7685-4c75-a707-ea7423b7f31c',
      'c7c2f344-ffc2-4b5f-a694-9e4b9b33dfce',
      '495360e5-4e90-4e69-a13c-e1f43b3d2eb4',
      '881624b3-8291-4de2-a2ac-467e0ece37da',
      'a86659d6-532c-4e1a-a4db-0f704a864a3b',
    ];
    const fertilizers = pool.filter((f) => WIDE.includes(f.id));
    const pair = detectManufacturerAbPairs(fertilizers).find((p) =>
      p.partA.name.toLowerCase().includes('floraduo'),
    )!;
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
        fastSolver: false,
      },
    });
    const anchor = anchoredManufacturerAbPartADoseGPerL(pair, netTarget, 'canonical');
    const ranked = [result.best, ...result.alternatives];
    for (const sol of ranked) {
      const a = sol.doses.find((d) => d.fertilizerId === pair.partA.id)?.amountPerL ?? 0;
      if (a > 0.01) console.log('flora ranked', a, 'alts', result.alternatives.length);
    }
    const option = ranked.find((sol) => {
      const a = sol.doses.find((d) => d.fertilizerId === pair.partA.id)?.amountPerL ?? 0;
      const b = sol.doses.find((d) => d.fertilizerId === pair.partB.id)?.amountPerL ?? 0;
      return a >= 0.01 && b >= 0.01 && a >= anchor * 0.9;
    });
    expect(option).toBeTruthy();
    expect(
      macroMatchScorePct(netTarget, option!.achievedPpm as Record<string, number>, 'canonical'),
    ).toBeGreaterThan(75);
  });
});
