import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeObjective,
  declaredToElemental,
  nitrogenSplitFromDoses,
  solveForward,
  solveReverse,
  unspecifiedNitrogenMissesFormTarget,
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

  it('doses label-total nitrogen against a total-N target without dropping the product', () => {
    const npk: FertilizerSpec = {
      id: 'npk',
      name: 'NPK',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { N: 16, P2O5: 8, K2O: 16 },
      elementalPct: {},
    };
    expect(nitrogenSplitFromDoses([npk], [1], 'canonical')).toMatchObject({
      nTotal: 160,
      unknown: 160,
      nh4: 0,
    });
    const result = solveForward({
      target: { N: 160, P: 35, K: 133 },
      fertilizers: [npk],
      options: { model: 'canonical' },
    });
    const achieved = result.best.achievedPpm as Record<string, number>;
    expect(result.best.doses[0]?.amountPerL).toBeGreaterThan(0.5);
    expect(achieved.N).toBeGreaterThan(100);
    expect(achieved.N_UNKNOWN).toBeCloseTo(achieved.N ?? 0, 5);
    expect(achieved.N_NO3 ?? 0).toBe(0);
    expect(result.best.warnings).toContain('nitrogen_form_unknown');
    expect(computeObjective(['N', 'N_UNKNOWN', 'P', 'K'], { N: 160 }, achieved)).toBeLessThan(0.05);
  });

  it('counts nitrate toward a total-N target and keeps the form on its own key', () => {
    const kno3: FertilizerSpec = {
      id: 'kno3',
      name: 'KNO3',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { NO3: 13.7, K: 38.6 },
      elementalPct: {},
    };
    const result = solveForward({
      target: { N: 100, K: 280 },
      fertilizers: [kno3],
      options: { model: 'canonical' },
    });
    const achieved = result.best.achievedPpm as Record<string, number>;
    expect(result.best.doses[0]?.amountPerL).toBeGreaterThan(0.5);
    expect(achieved.N_NO3 ?? 0).toBeGreaterThan(80);
    expect(achieved.N ?? 0).toBe(0);
    expect(result.best.matchScore).toBeGreaterThan(0.8);
    expect(result.best.warnings).not.toContain('nitrogen_form_unknown');
  });

  it('does not fill a nitrate target from label-total nitrogen', () => {
    const npk: FertilizerSpec = {
      id: 'npk',
      name: 'NPK',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { N: 16, P2O5: 8, K2O: 16 },
      elementalPct: {},
    };
    const result = solveForward({
      target: { N_NO3: 100, P: 20, K: 80 },
      fertilizers: [npk],
      options: { model: 'canonical' },
    });
    const achieved = result.best.achievedPpm as Record<string, number>;
    expect(achieved.N_NO3 ?? 0).toBe(0);
    expect(result.best.warnings).toContain('nitrogen_form_unknown');
    expect(unspecifiedNitrogenMissesFormTarget({ N_NO3: 100 }, result.best.warnings)).toBe(true);
    expect(unspecifiedNitrogenMissesFormTarget({ N: 100 }, result.best.warnings)).toBe(false);
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
