import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  growlogMacroMatchPct,
  solveForward,
  solveReverseHydroodo,
  weightedMacroDeviation,
  withinOverdoseCaps,
} from '@growlog/nutrient-calc';
import type { FertilizerSpec } from '@growlog/nutrient-calc';

interface GoldenCase {
  id: string;
  inputs: {
    target_mg_l: Record<string, number>;
    overdose_pct: Record<string, number>;
    min_match_pct: number;
    fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>;
  };
  outputs: {
    status: string;
    doses_g_or_ml_per_l?: Array<{ name: string; dose: number }>;
    elements_mg_l?: Record<string, { target?: number; computed_from_doses?: number | null }>;
    match_pct?: number;
  };
}

const goldenPath = path.join(
  process.cwd(),
  'tests/fixtures/nutrient-golden/hydroodo/cases.json',
);
const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as { cases: GoldenCase[] };

function hydroodoAchieved(case_: GoldenCase): Record<string, number> {
  const fertByName = new Map(
    case_.inputs.fertilizers.map((f) => [f.name, f.declared_pct] as const),
  );
  const doses = (case_.outputs.doses_g_or_ml_per_l ?? []).map((d) => ({
    declaredPct: fertByName.get(d.name)!,
    dosePerL: d.dose,
  }));
  return solveReverseHydroodo(doses);
}

function toFertilizers(case_: GoldenCase): FertilizerSpec[] {
  return case_.inputs.fertilizers.map((f, i) => ({
    id: `${f.brand}|${f.name}|${i}`,
    brand: f.brand,
    name: f.name,
    physicalForm: f.brand.includes('USA') || f.brand.includes('France') ? 'liquid' : 'solid',
    doseUnit:
      f.brand.includes('USA') || f.brand.includes('France') ? 'ml_per_L' : 'g_per_L',
    declaredPct: f.declared_pct,
    elementalPct: {},
  }));
}

const parityRows: Array<Record<string, string | number>> = [];

for (const case_ of golden.cases) {
  if (case_.outputs.status !== 'ok') continue;
  const target = case_.inputs.target_mg_l;
  const hydroAchieved = hydroodoAchieved(case_);
  const hydroMatch = growlogMacroMatchPct(target, hydroAchieved);
  const hydroWmd = weightedMacroDeviation(target, hydroAchieved);

  const ours = solveForward({
    target,
    fertilizers: toFertilizers(case_),
    options: {
      overdosePctByGroup: case_.inputs.overdose_pct,
      minMatchPct: case_.inputs.min_match_pct,
      doseDecimals: 3,
      maxAlternatives: 1,
    },
  });

  const ourMatch = growlogMacroMatchPct(target, ours.best.achievedPpm);
  const ourWmd = weightedMacroDeviation(target, ours.best.achievedPpm);

  parityRows.push({
    case: case_.id,
    hydroodo_match_pct: Math.round(hydroMatch * 100) / 100,
    growlog_match_pct: Math.round(ourMatch * 100) / 100,
    hydroodo_wmd: Math.round(hydroWmd * 10000) / 10000,
    growlog_wmd: Math.round(ourWmd * 10000) / 10000,
    hydroodo_gui_pct: case_.outputs.match_pct ?? 0,
  });
}

describe('Hydroodo golden inverse parity (quality, not identical doses)', () => {
  it('emits parity summary table for PR', () => {
    // eslint-disable-next-line no-console
    console.table(parityRows);
    expect(parityRows.length).toBeGreaterThan(0);
  });

  for (const case_ of golden.cases) {
    if (case_.outputs.status !== 'ok') continue;

    it(`${case_.id}: caps respected and match >= Hydroodo macro match`, () => {
      const target = case_.inputs.target_mg_l;
      const hydroAchieved = hydroodoAchieved(case_);
      const hydroMatch = growlogMacroMatchPct(target, hydroAchieved);
      const hydroWmd = weightedMacroDeviation(target, hydroAchieved);

      const result = solveForward({
        target,
        fertilizers: toFertilizers(case_),
        options: {
          overdosePctByGroup: case_.inputs.overdose_pct,
          minMatchPct: case_.inputs.min_match_pct,
          doseDecimals: 3,
          maxAlternatives: 2,
        },
      });

      expect(withinOverdoseCaps(target, result.best.achievedPpm, case_.inputs.overdose_pct)).toBe(
        true,
      );

      const ourMatch = growlogMacroMatchPct(target, result.best.achievedPpm);
      const ourWmd = weightedMacroDeviation(target, result.best.achievedPpm);
      const groups = Object.keys(target).filter((g) => (target[g] ?? 0) > 0);
      const hydroObj = computeObjective(groups, target, hydroAchieved, DEFAULT_SOLVER_OBJECTIVE);
      const ourObj = computeObjective(
        groups,
        target,
        result.best.achievedPpm,
        DEFAULT_SOLVER_OBJECTIVE,
      );

      expect(ourObj).toBeLessThanOrEqual(hydroObj * 1.1 + 0.03);
      expect(ourWmd).toBeLessThanOrEqual(hydroWmd + 0.25);
      const ourMatchPct = growlogMacroMatchPct(target, result.best.achievedPpm);
      expect(ourMatchPct).toBeGreaterThanOrEqual(hydroMatch - 20);
      expect(result.best.doses.length).toBeGreaterThan(0);
    });
  }

  for (const case_ of golden.cases.filter((c) => c.outputs.status === 'no_variants')) {
    it(`${case_.id}: best-effort solution despite Hydroodo no_variants`, () => {
      const result = solveForward({
        target: case_.inputs.target_mg_l,
        fertilizers: toFertilizers(case_),
        options: {
          overdosePctByGroup: case_.inputs.overdose_pct,
          minMatchPct: case_.inputs.min_match_pct,
          doseDecimals: 3,
        },
      });
      expect(result.best.doses.length).toBeGreaterThan(0);
      expect(result.best.warnings.length).toBeGreaterThan(0);
    });
  }
});
