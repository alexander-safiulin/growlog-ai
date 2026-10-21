import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { solveReverseHydroodo } from '@growlog/nutrient-calc';

interface GoldenCase {
  id: string;
  inputs: {
    fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>;
    target_mg_l: Record<string, number>;
  };
  outputs: {
    status: string;
    doses_g_or_ml_per_l?: Array<{ name: string; dose: number }>;
    elements_mg_l?: Record<
      string,
      { target?: number; computed_from_doses?: number | null; shown?: number }
    >;
  };
}

const goldenPath = path.join(
  process.cwd(),
  'tests/fixtures/nutrient-golden/hydroodo/cases.json',
);
const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as { cases: GoldenCase[] };

describe('Hydroodo forward model (GUI formula)', () => {
  for (const case_ of golden.cases) {
    if (case_.outputs.status !== 'ok') continue;

    it(`${case_.id} reproduces macro mg/L from golden doses`, () => {
      const fertByName = new Map(
        case_.inputs.fertilizers.map((f) => [f.name, f.declared_pct] as const),
      );
      const doses = (case_.outputs.doses_g_or_ml_per_l ?? []).map((d) => ({
        declaredPct: fertByName.get(d.name)!,
        dosePerL: d.dose,
      }));

      const achieved = solveReverseHydroodo(doses);

      for (const [element, row] of Object.entries(case_.outputs.elements_mg_l ?? {})) {
        const expected = row.shown;
        if (expected == null) {
          if (row.computed_from_doses == null) {
            expect(achieved[element] ?? 0).toBe(0);
          }
          continue;
        }
        expect(achieved[element] ?? 0).toBeCloseTo(expected, 2);
        expect(Math.abs((achieved[element] ?? 0) - expected)).toBeLessThanOrEqual(0.005);
      }
    });
  }
});
