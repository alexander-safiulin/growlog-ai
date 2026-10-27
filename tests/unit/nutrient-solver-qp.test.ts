import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeObjective,
  computeSolverObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  fertilizerRoleEquivalenceKey,
  macroMatchScorePct,
  solveForward,
  solveMagicWand,
  solveReverse,
  type FertilizerSpec,
  type SolveSolution,
} from '@growlog/nutrient-calc';

interface GoldenCase {
  id: string;
  inputs: {
    target_mg_l: Record<string, number>;
    overdose_pct: Record<string, number>;
    fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>;
  };
}

const golden = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests/fixtures/nutrient-golden/hydroodo/cases.json'), 'utf8'),
) as { cases: GoldenCase[] };

function goldenCase(id: string): GoldenCase {
  return golden.cases.find((c) => c.id === id)!;
}

function specs(case_: GoldenCase): FertilizerSpec[] {
  return case_.inputs.fertilizers.map((f) => ({
    id: `${f.brand}|${f.name}`,
    brand: f.brand,
    name: f.name,
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: f.declared_pct,
    elementalPct: {},
  }));
}

/** Union of salt + micro products from four OLK/Valagro golden cases (12 distinct products). */
function broadSelection(): FertilizerSpec[] {
  const ids = [
    'case04_olk_veg_salts',
    'case08_olk_veg_master181818',
    'case13_olk_bloom13_valagro',
    'case10_olk_bloom_aquarin',
  ];
  const byId = new Map<string, FertilizerSpec>();
  for (const id of ids) for (const f of specs(goldenCase(id))) if (!byId.has(f.id)) byId.set(f.id, f);
  return [...byId.values()];
}

function expectPpmMatchesDoses(
  sol: SolveSolution,
  fertilizers: FertilizerSpec[],
  model: 'canonical' | 'hydroodo_legacy',
) {
  const byId = new Map(fertilizers.map((f) => [f.id, f]));
  const reverse = solveReverse({
    doses: sol.doses.map((d) => ({ fertilizer: byId.get(d.fertilizerId)!, amountPerL: d.amountPerL })),
    options: { model },
  });
  const shown = sol.achievedPpm as Record<string, number>;
  const actual = reverse.achievedPpm as Record<string, number>;
  for (const k of new Set([...Object.keys(shown), ...Object.keys(actual)])) {
    expect(shown[k] ?? 0).toBeCloseTo(actual[k] ?? 0, 6);
  }
}

describe('objective normalisation', () => {
  it('adding an unsolicited element never lowers the objective', () => {
    const target = { N: 150, P: 50, K: 200, Ca: 150, Mg: 50, S: 60 };
    const achieved = { N: 140, P: 48, K: 190, Ca: 160, Mg: 45, S: 70 };
    const groups = Object.keys(target);
    const clean = computeObjective(groups, target, achieved);
    const withNaCl = computeObjective(groups, target, { ...achieved, Na: 0.5, Cl: 0.5 });
    expect(withNaCl).toBeGreaterThan(clean);
  });

  it('soft micro cap adds a penalty only above the ceiling and only in soft mode', () => {
    const target = { Fe: 2, Cu: 0.05 };
    const atCap = { Fe: 2, Cu: 0.075 };
    const overCap = { Fe: 2, Cu: 0.1 };
    const groups = ['Fe', 'Cu'];
    const od = { Cu: 50 };
    const base = (a: Record<string, number>) => computeObjective(groups, target, a);
    expect(computeSolverObjective(groups, target, atCap, DEFAULT_SOLVER_OBJECTIVE, od)).toBeCloseTo(
      base(atCap),
      12,
    );
    expect(computeSolverObjective(groups, target, overCap, DEFAULT_SOLVER_OBJECTIVE, od)).toBeGreaterThan(
      base(overCap) * 2,
    );
    expect(
      computeSolverObjective(groups, target, overCap, DEFAULT_SOLVER_OBJECTIVE, od, 'hard'),
    ).toBeCloseTo(base(overCap), 12);
  });
});

describe('micro overdose caps', () => {
  const case08 = goldenCase('case08_olk_veg_master181818');
  const t = case08.inputs.target_mg_l;
  const od = case08.inputs.overdose_pct;
  const solve = (microOverdoseCap: 'soft' | 'hard') =>
    solveForward({
      target: t,
      fertilizers: specs(case08),
      options: { model: 'hydroodo_legacy', overdosePctByGroup: od, microOverdoseCap },
    });
  const ach = (r: ReturnType<typeof solve>) => r.best.achievedPpm as Record<string, number>;

  it('binding Cu ceiling: soft mode trades a small Cu overshoot for more micros and warns', () => {
    const soft = solve('soft');
    const hard = solve('hard');
    expect(ach(hard).Cu ?? 0).toBeLessThanOrEqual(t.Cu * (1 + (od.Cu ?? 50) / 100) + 1e-6);
    expect(hard.best.warnings.some((w) => w.startsWith('micro_over_cap'))).toBe(false);
    expect(soft.best.warnings).toContain('micro_over_cap:Cu');
    expect(ach(soft).Fe ?? 0).toBeGreaterThan(ach(hard).Fe ?? 0);
    expect(ach(soft).Mo ?? 0).toBeGreaterThan(ach(hard).Mo ?? 0);
    expect(ach(soft).Cu ?? 0).toBeLessThan(t.Cu * (1 + (od.Cu ?? 50) / 100) * 1.1);
  });

  it('macro caps stay hard in soft mode', () => {
    const a = ach(solve('soft'));
    for (const g of ['N', 'P', 'K', 'Ca', 'Mg', 'S']) {
      if (!(t[g] > 0)) continue;
      expect(a[g] ?? 0).toBeLessThanOrEqual(t[g] * (1 + (od[g] ?? 50) / 100) + 1e-6);
    }
  });
});

describe('ammonium share constraint', () => {
  const fertilizers: FertilizerSpec[] = [
    { id: 'kno3', name: 'KNO3', physicalForm: 'solid', doseUnit: 'g_per_L', declaredPct: { NO3: 13.86, K: 38.67 }, elementalPct: {} },
    { id: 'cano3', name: 'Ca(NO3)2', physicalForm: 'solid', doseUnit: 'g_per_L', declaredPct: { NO3: 11.86, Ca: 16.98 }, elementalPct: {} },
    { id: 'nh4so4', name: '(NH4)2SO4', physicalForm: 'solid', doseUnit: 'g_per_L', declaredPct: { NH4: 21.2, S: 24.2 }, elementalPct: {} },
  ];
  const target = { N_NO3: 150, N_NH4: 60, K: 200, Ca: 150, S: 60 };
  const share = (sol: SolveSolution) => {
    const a = sol.achievedPpm as Record<string, number>;
    return (a.N_NH4 ?? 0) / ((a.N_NO3 ?? 0) + (a.N_NH4 ?? 0));
  };

  it('holds NH4 / N at or below the limit', () => {
    const free = solveForward({ target, fertilizers, options: { model: 'canonical' } });
    const capped = solveForward({
      target,
      fertilizers,
      options: { model: 'canonical', maxAmmoniumShare: 0.1 },
    });
    expect(share(free.best)).toBeGreaterThan(0.15);
    expect(share(capped.best)).toBeLessThanOrEqual(0.1 + 1e-3);
    expect(capped.best.warnings).not.toContain('infeasible_best_effort');
  });
});

describe('magic wand result consistency', () => {
  const case04 = goldenCase('case04_olk_veg_salts');
  const options = {
    model: 'hydroodo_legacy' as const,
    overdosePctByGroup: case04.inputs.overdose_pct,
    maxAlternatives: 4,
  };

  it('shown ppm equals a reverse solve of the shown doses (no hidden sub-0.01 lines)', () => {
    for (const fertilizers of [specs(case04), broadSelection()]) {
      const result = solveMagicWand({ target: case04.inputs.target_mg_l, fertilizers, options });
      for (const sol of [result.best, ...result.alternatives]) {
        for (const d of sol.doses) expect(d.amountPerL).toBeGreaterThanOrEqual(0.01);
        expectPpmMatchesDoses(sol, fertilizers, 'hydroodo_legacy');
      }
    }
  });

  it('a wider selection keeps the quality the solver can reach on it', () => {
    const target = case04.inputs.target_mg_l;
    const fertilizers = broadSelection();
    const pct = (s: SolveSolution) =>
      macroMatchScorePct(target, s.achievedPpm as Record<string, number>, 'hydroodo_legacy');
    const narrow = solveMagicWand({ target, fertilizers: specs(case04), options });
    const wide = solveMagicWand({ target, fertilizers, options });
    const direct = solveForward({ target, fertilizers, options });
    expect(pct(wide.best)).toBeGreaterThanOrEqual(pct(narrow.best));
    expect(pct(wide.best)).toBeGreaterThanOrEqual(99);
    expect(pct(wide.best)).toBeGreaterThanOrEqual(pct(direct.best) - 1);
  });

  it('legacy targets with micros still produce alternatives', () => {
    const result = solveMagicWand({
      target: case04.inputs.target_mg_l,
      fertilizers: broadSelection(),
      options,
    });
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('a micro mix carrying some Ca is not role-equivalent to a Ca salt', () => {
    const byName = new Map(broadSelection().map((f) => [f.name, f]));
    const key = (name: string) => fertilizerRoleEquivalenceKey(byName.get(name)!, 'hydroodo_legacy');
    expect(key('Аквамикс')).not.toBe(key('CALBIT'));
    expect(key('Master 18.18.18+3')).not.toMatch(/^id:/);
  });

  it('ranks by shown match %, then fewer products', () => {
    const result = solveMagicWand({
      target: case04.inputs.target_mg_l,
      fertilizers: broadSelection(),
      options,
    });
    const ranked = [result.best, ...result.alternatives];
    for (let i = 1; i < ranked.length; i++) {
      const prev = Math.round(ranked[i - 1].matchScore * 100);
      const cur = Math.round(ranked[i].matchScore * 100);
      expect(prev).toBeGreaterThanOrEqual(cur);
      if (prev === cur) {
        expect(ranked[i - 1].doses.length).toBeLessThanOrEqual(ranked[i].doses.length);
      }
    }
  });
});
