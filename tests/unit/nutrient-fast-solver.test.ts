import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectGroups,
  computeObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  solveForward,
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
  outputs: { status: string };
}

const goldenPath = path.join(process.cwd(), 'tests/fixtures/nutrient-golden/hydroodo/cases.json');
const referencePath = path.join(process.cwd(), 'tests/fixtures/nutrient-golden/reference-optima.json');

const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as { cases: GoldenCase[] };
const reference = JSON.parse(readFileSync(referencePath, 'utf8')) as {
  cases: Record<string, { objective: number | null }>;
};

function toFertilizers(case_: GoldenCase): FertilizerSpec[] {
  return case_.inputs.fertilizers.map((f, i) => ({
    id: `${f.brand}|${f.name}|${i}`,
    brand: f.brand,
    name: f.name,
    physicalForm: f.brand.includes('USA') || f.brand.includes('France') ? 'liquid' : 'solid',
    doseUnit: f.brand.includes('USA') || f.brand.includes('France') ? 'ml_per_L' : 'g_per_L',
    declaredPct: f.declared_pct,
    elementalPct: {},
  }));
}

function forwardOptions(case_: GoldenCase) {
  return {
    model: 'hydroodo_legacy' as const,
    overdosePctByGroup: case_.inputs.overdose_pct,
    minMatchPct: case_.inputs.min_match_pct,
    fastSolver: true,
    doseDecimals: 3,
  };
}

function objectiveForCase(case_: GoldenCase, achieved: Record<string, number>): number {
  const fertilizers = toFertilizers(case_);
  const groups = collectGroups(fertilizers, case_.inputs.target_mg_l, 'hydroodo_legacy');
  return computeObjective(
    groups,
    case_.inputs.target_mg_l,
    achieved,
    DEFAULT_SOLVER_OBJECTIVE,
  );
}

describe('fastSolver golden safety', () => {
  const ids = ['case08_olk_veg_master181818', 'case09_ghe_w2_floraduo', 'case05_olk_bloom_salts'];

  for (const id of ids) {
    it(`${id}: fastSolver respects overdose caps`, () => {
      const case_ = golden.cases.find((c) => c.id === id)!;
      expect(case_).toBeDefined();
      const result = solveForward({
        target: case_.inputs.target_mg_l,
        fertilizers: toFertilizers(case_),
        options: forwardOptions(case_),
      });
      expect(
        withinOverdoseCaps(case_.inputs.target_mg_l, result.best.achievedPpm, case_.inputs.overdose_pct),
      ).toBe(true);
    });

    it(`${id}: fastSolver objective within 2% of reference optimum`, () => {
      const case_ = golden.cases.find((c) => c.id === id)!;
      const refObj = reference.cases[case_.id]?.objective;
      expect(refObj).not.toBeNull();
      const result = solveForward({
        target: case_.inputs.target_mg_l,
        fertilizers: toFertilizers(case_),
        options: forwardOptions(case_),
      });
      const ourObj = objectiveForCase(case_, result.best.achievedPpm);
      expect(ourObj).toBeLessThanOrEqual((refObj as number) * 1.02 + 1e-9);
    });
  }
});
