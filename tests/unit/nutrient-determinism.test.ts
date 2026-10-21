import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { solveForward } from '@growlog/nutrient-calc';
import type { FertilizerSpec } from '@growlog/nutrient-calc';

const goldenPath = path.join(
  process.cwd(),
  'tests/fixtures/nutrient-golden/hydroodo/cases.json',
);
const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as {
  cases: Array<{
    id: string;
    inputs: {
      target_mg_l: Record<string, number>;
      overdose_pct: Record<string, number>;
      min_match_pct: number;
      fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>;
    };
    outputs: { status: string };
  }>;
};

function toFertilizers(
  fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>,
): FertilizerSpec[] {
  return fertilizers.map((f, i) => ({
    id: `${f.brand}|${f.name}|${i}`,
    brand: f.brand,
    name: f.name,
    physicalForm: 'liquid',
    doseUnit: 'ml_per_L',
    declaredPct: f.declared_pct,
    elementalPct: {},
  }));
}

describe('nutrient solver determinism', () => {
  it('repeated forward solves deep-equal (doses thousandths, alternatives order)', () => {
    const case_ = golden.cases.find((c) => c.id === 'case01_ghe_w2_flora3')!;
    const input = {
      target: case_.inputs.target_mg_l,
      fertilizers: toFertilizers(case_.inputs.fertilizers),
      options: {
        model: 'hydroodo_legacy' as const,
        overdosePctByGroup: case_.inputs.overdose_pct,
        minMatchPct: case_.inputs.min_match_pct,
        doseDecimals: 3,
        maxAlternatives: 2,
      },
    };
    const a = solveForward(input);
    const b = solveForward(input);
    expect(a).toEqual(b);
    for (const sol of [a.best, ...a.alternatives]) {
      for (const d of sol.doses) {
        expect(d.amountPerL).toBe(Math.round(d.amountPerL * 1000) / 1000);
      }
    }
  });
});
