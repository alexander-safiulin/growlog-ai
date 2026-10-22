import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectGroups,
  computeObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  growlogMatchPct,
  solveForward,
  solveReverseHydroodo,
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
  };
}

interface ReferenceOptima {
  cases: Record<
    string,
    {
      objective: number | null;
      objective_continuous?: number | null;
      cap_feasible?: boolean;
      status?: string;
    }
  >;
  notes?: Record<string, string>;
}

function referenceLimit(caseId: string): number {
  return reference.cases[caseId]!.objective as number;
}

const goldenPath = path.join(
  process.cwd(),
  'tests/fixtures/nutrient-golden/hydroodo/cases.json',
);
const referencePath = path.join(
  process.cwd(),
  'tests/fixtures/nutrient-golden/reference-optima.json',
);
const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as { cases: GoldenCase[] };
const reference = JSON.parse(readFileSync(referencePath, 'utf8')) as ReferenceOptima;

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

function forwardOptions(case_: GoldenCase) {
  return {
    model: 'hydroodo_legacy' as const,
    overdosePctByGroup: case_.inputs.overdose_pct,
    minMatchPct: case_.inputs.min_match_pct,
    doseDecimals: 3,
    maxAlternatives: 2,
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

describe('Hydroodo golden inverse parity (strict)', () => {
  for (const case_ of golden.cases) {
    if (case_.outputs.status !== 'ok') continue;

    it(`${case_.id}: caps, reference objective, Hydroodo when feasible`, () => {
      const target = case_.inputs.target_mg_l;
      const hydroAchieved = hydroodoAchieved(case_);
      const hydroCapFeasible = withinOverdoseCaps(
        target,
        hydroAchieved,
        case_.inputs.overdose_pct,
      );
      const hydroObj = objectiveForCase(case_, hydroAchieved);

      const result = solveForward({
        target,
        fertilizers: toFertilizers(case_),
        options: forwardOptions(case_),
      });

      expect(
        withinOverdoseCaps(target, result.best.achievedPpm, case_.inputs.overdose_pct),
      ).toBe(true);

      const ourObj = objectiveForCase(case_, result.best.achievedPpm);
      const ref = reference.cases[case_.id];
      expect(ref?.objective).not.toBeNull();
      expect(ourObj).toBeLessThanOrEqual(referenceLimit(case_.id) * 1.005 + 1e-9);

      if (hydroCapFeasible) {
        expect(ourObj).toBeLessThanOrEqual(hydroObj + 1e-6);
      }

      if (case_.id === 'case08_olk_veg_master181818') {
        expect(reference.notes?.[case_.id]).toMatch(/Cu cap/i);
        expect(hydroCapFeasible).toBe(false);
      }

      expect(result.best.doses.length).toBeGreaterThan(0);
    });
  }

  it('case14_samosa_night_flora3: unsolicited N and S reported and penalised', () => {
    const case_ = golden.cases.find((c) => c.id === 'case14_samosa_night_flora3')!;
    const result = solveForward({
      target: case_.inputs.target_mg_l,
      fertilizers: toFertilizers(case_),
      options: forwardOptions(case_),
    });
    expect((result.best.achievedPpm.N ?? 0) > 0).toBe(true);
    expect((result.best.achievedPpm.S ?? 0) > 0).toBe(true);
    expect(result.best.doses.some((d) => d.amountPerL > 0)).toBe(true);
    const ref = referenceLimit(case_.id);
    expect(objectiveForCase(case_, result.best.achievedPpm)).toBeLessThanOrEqual(
      ref * 1.005 + 1e-9,
    );
  });

  for (const case_ of golden.cases.filter((c) => c.outputs.status === 'no_variants')) {
    it(`${case_.id}: warning code for no_variants`, () => {
      const result = solveForward({
        target: case_.inputs.target_mg_l,
        fertilizers: toFertilizers(case_),
        options: forwardOptions(case_),
      });
      expect(result.best.doses.length).toBeGreaterThan(0);
      const codes = result.best.warnings;
      const match = growlogMatchPct(case_.inputs.target_mg_l, result.best.achievedPpm);
      if (match < case_.inputs.min_match_pct) {
        expect(codes).toContain('below_min_match_threshold');
      } else {
        expect(
          codes.includes('infeasible_best_effort') || codes.includes('below_min_match_threshold'),
        ).toBe(false);
        if (case_.id === 'case12_olk_veg_salts_min50') {
          expect(reference.notes?.[case_.id]).toMatch(/no_variants/i);
        }
      }
    });
  }

  it('each ok golden case solves within median time budget (warmup + 5 runs)', () => {
    const warmCase = golden.cases.find((c) => c.outputs.status === 'ok')!;
    solveForward({
      target: warmCase.inputs.target_mg_l,
      fertilizers: toFertilizers(warmCase),
      options: forwardOptions(warmCase),
    });
    for (const case_ of golden.cases) {
      if (case_.outputs.status !== 'ok') continue;
      const samples: number[] = [];
      for (let r = 0; r < 5; r++) {
        const t0 = performance.now();
        solveForward({
          target: case_.inputs.target_mg_l,
          fertilizers: toFertilizers(case_),
          options: forwardOptions(case_),
        });
        samples.push(performance.now() - t0);
      }
      samples.sort((a, b) => a - b);
      expect(samples[2]).toBeLessThan(250);
    }
  });

  it('case08 perturbed target stays within 2% of reference objective', () => {
    const case_ = golden.cases.find((c) => c.id === 'case08_olk_veg_master181818')!;
    const refObj = reference.cases[case_.id]!.objective as number;
    const target = { ...case_.inputs.target_mg_l };
    for (const k of Object.keys(target)) {
      target[k] = target[k] * 1.008;
    }
    const result = solveForward({
      target,
      fertilizers: toFertilizers(case_),
      options: forwardOptions(case_),
    });
    const ourObj = objectiveForCase(
      { ...case_, inputs: { ...case_.inputs, target_mg_l: target } },
      result.best.achievedPpm,
    );
    expect(ourObj).toBeLessThanOrEqual(refObj * 1.02 + 1e-6);
  });
});
