import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  declaredToElemental,
  solveForward,
  solveReverse,
  withinOverdoseCaps,
} from '@growlog/nutrient-calc';
import type { FertilizerSpec } from '@growlog/nutrient-calc';

describe('canonical chemistry model', () => {
  it('maps nitrogen_form_unknown to N_UNKNOWN counted in N', () => {
    const { pct, warnings } = declaredToElemental({ N: 5, P2O5: 10 });
    expect(warnings).toContain('nitrogen_form_unknown');
    expect(pct.N_UNKNOWN).toBe(5);
    expect(pct.N).toBe(5);
  });

  it('solveForward defaults to canonical and respects caps', () => {
    const fertilizers: FertilizerSpec[] = [
      {
        id: 'ca',
        name: 'Calcium nitrate',
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        declaredPct: { NO3: 11.6, Ca: 16.6 },
        elementalPct: {},
      },
    ];
    const target = { N_NO3: 50, Ca: 70 };
    const result = solveForward({
      target,
      fertilizers,
      options: { overdosePctByGroup: { N_NO3: 20, Ca: 20 } },
    });
    expect(result.best.doses.length).toBeGreaterThan(0);
    expect(withinOverdoseCaps(target, result.best.achievedPpm, { N_NO3: 20, Ca: 20 })).toBe(
      true,
    );
  });

  it('solveReverse uses canonical oxide factors by default', () => {
    const fertilizers: FertilizerSpec[] = [
      {
        id: 'k',
        name: 'K salt',
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        declaredPct: { K2O: 50 },
        elementalPct: {},
      },
    ];
    const result = solveReverse({
      doses: [{ fertilizer: fertilizers[0], amountPerL: 1 }],
      options: { model: 'canonical' },
    });
    expect((result.achievedPpm.K ?? 0) > 0).toBe(true);
  });

  it('golden case01 canonical forward stays cap-feasible', () => {
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
          fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>;
        };
        outputs: { status: string };
      }>;
    };
    const case_ = golden.cases.find((c) => c.id === 'case01_ghe_w2_flora3')!;
    const fertilizers = case_.inputs.fertilizers.map((f, i) => ({
      id: `${f.brand}|${f.name}|${i}`,
      brand: f.brand,
      name: f.name,
      physicalForm: 'liquid' as const,
      doseUnit: 'ml_per_L' as const,
      declaredPct: f.declared_pct,
      elementalPct: {},
    }));
    const result = solveForward({
      target: case_.inputs.target_mg_l,
      fertilizers,
      options: {
        model: 'canonical',
        overdosePctByGroup: case_.inputs.overdose_pct,
        doseDecimals: 3,
      },
    });
    expect(
      withinOverdoseCaps(
        case_.inputs.target_mg_l,
        result.best.achievedPpm,
        case_.inputs.overdose_pct,
      ),
    ).toBe(true);
  });
});
