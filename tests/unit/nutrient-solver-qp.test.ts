import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeObjective,
  computeSolverObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  fertilizerRoleEquivalenceKey,
  isMicroCarrier,
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
    const withNaCl = computeObjective(groups, target, { ...achieved, Na: 25, Cl: 25 });
    expect(withNaCl).toBeGreaterThan(clean);
  });

  it('untargeted elements are free up to the top of their working range, penalised above it', () => {
    const target = { N: 150, P: 50, K: 200, Ca: 150, Mg: 50, Fe: 2 };
    const achieved = { N: 150, P: 50, K: 200, Ca: 150, Mg: 50, Fe: 2 };
    const groups = Object.keys(target);
    const clean = computeObjective(groups, target, achieved);
    const typical = { ...achieved, B: 0.5, Mn: 1, Zn: 0.5, Cu: 0.1, Mo: 0.05, S: 50, Na: 10 };
    const excessive = { ...achieved, Cu: 0.2 };
    expect(computeObjective(groups, target, typical)).toBeCloseTo(clean, 12);
    expect(computeObjective(groups, target, excessive)).toBeGreaterThan(clean);
    expect(
      computeObjective(groups, target, typical, { ...DEFAULT_SOLVER_OBJECTIVE, unsolicitedFreeFraction: 0 }),
    ).toBeGreaterThan(clean);
  });

  it('soft micro ceiling is the larger of target + overdose% and the tested-safe level', () => {
    const target = { Fe: 2, Cu: 0.05, Mo: 0.05 };
    const groups = Object.keys(target);
    const od = { Cu: 50, Mo: 50 };
    const capTerm = (
      a: Record<string, number>,
      mode: 'soft' | 'hard' = 'soft',
      background: Record<string, number> = {},
    ) =>
      computeSolverObjective(groups, target, a, DEFAULT_SOLVER_OBJECTIVE, od, mode, background) -
      computeObjective(groups, target, a);
    expect(capTerm({ Fe: 2, Cu: 0.38, Mo: 0.075 })).toBeCloseTo(0, 12);
    expect(capTerm({ Fe: 2, Cu: 0.45, Mo: 0.05 })).toBeGreaterThan(0);
    expect(capTerm({ Fe: 2, Cu: 0.05, Mo: 0.1 })).toBeGreaterThan(0);
    expect(capTerm({ Fe: 2, Cu: 0.3, Mo: 0.05 }, 'soft', { Cu: 0.1 })).toBeGreaterThan(0);
    expect(capTerm({ Fe: 2, Cu: 0.45, Mo: 0.1 }, 'hard')).toBeCloseTo(0, 12);
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

  it('incidental Cu in an NPK salt does not cost P and K; below the tested-safe level it is not flagged', () => {
    const soft = solve('soft');
    const hard = solve('hard');
    const cuCap = t.Cu * (1 + (od.Cu ?? 50) / 100);
    expect(ach(hard).Cu ?? 0).toBeLessThanOrEqual(cuCap + 1e-6);
    expect(ach(soft).Cu ?? 0).toBeGreaterThan(cuCap);
    expect(ach(soft).Cu ?? 0).toBeLessThan(0.38);
    for (const r of [soft, hard]) {
      expect(r.best.warnings.some((w) => w.startsWith('micro_over_cap'))).toBe(false);
    }
    for (const g of ['N', 'P', 'K']) {
      expect(ach(soft)[g] ?? 0).toBeGreaterThan((ach(hard)[g] ?? 0) * 1.05);
    }
    const groups = Object.keys(ach(soft));
    const solverObj = (a: Record<string, number>) =>
      computeSolverObjective(groups, t, a, DEFAULT_SOLVER_OBJECTIVE, od);
    expect(solverObj(ach(soft))).toBeLessThanOrEqual(solverObj(ach(hard)) + 1e-9);
  });

  it('macro caps stay hard in soft mode', () => {
    const a = ach(solve('soft'));
    for (const g of ['N', 'P', 'K', 'Ca', 'Mg', 'S']) {
      if (!(t[g] > 0)) continue;
      expect(a[g] ?? 0).toBeLessThanOrEqual(t[g] * (1 + (od[g] ?? 50) / 100) + 1e-6);
    }
  });
});

describe('micro harm ceilings (4× tested level, total solution ppm)', () => {
  const boronFeMix: FertilizerSpec = {
    id: 'test|fe-b-mix',
    brand: 'test',
    name: 'Fe-B mix',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { Fe: 2, B: 1 },
    elementalPct: {},
  };
  const run = (
    target: Record<string, number>,
    extra: Partial<NonNullable<Parameters<typeof solveForward>[0]['options']>> = {},
    water?: Record<string, number>,
  ) =>
    solveForward({
      target,
      fertilizers: [boronFeMix],
      sourceWater: water ? { ppm: water } : undefined,
      options: { model: 'hydroodo_legacy', ...extra },
    });

  it('never exceeds the B harm level, even when the targets pull above it, and reports it', () => {
    for (const mode of ['soft', 'hard'] as const) {
      const r = run({ Fe: 10, B: 1.8 }, { microOverdoseCap: mode, overdosePctByGroup: { B: 200 } });
      const a = r.best.achievedPpm as Record<string, number>;
      expect(a.B ?? 0).toBeLessThanOrEqual(1.96 + 1e-6);
      expect(a.B ?? 0).toBeGreaterThan(1.9);
      expect(r.best.warnings).toContain('micro_harm_cap:B');
    }
  });

  it('counts source water toward the ceiling', () => {
    const r = run({ Fe: 10, B: 1.9 }, { overdosePctByGroup: { B: 200 } }, { B: 0.5 });
    const a = r.best.achievedPpm as Record<string, number>;
    expect(a.B ?? 0).toBeLessThanOrEqual(1.96 + 1e-6);
    expect(a.B ?? 0).toBeGreaterThan(1.9);
    expect(r.best.warnings).toContain('micro_harm_cap:B');
  });

  it('an explicit target above the harm level is respected without the harm warning', () => {
    const r = run({ Fe: 6, B: 3 });
    const a = r.best.achievedPpm as Record<string, number>;
    expect(a.B ?? 0).toBeGreaterThan(1.96);
    expect(r.best.warnings.some((w) => w.startsWith('micro_harm_cap'))).toBe(false);
  });
});

describe('untargeted co-elements of a micro mix', () => {
  it('Fe-only micro target reaches Fe; B/Mn/Zn/Cu/Mo stay inside their working range', () => {
    const case13 = goldenCase('case13_olk_bloom13_valagro');
    const r = solveForward({
      target: case13.inputs.target_mg_l,
      fertilizers: specs(case13),
      options: { model: 'hydroodo_legacy', overdosePctByGroup: case13.inputs.overdose_pct },
    });
    const a = r.best.achievedPpm as Record<string, number>;
    expect(a.Fe ?? 0).toBeGreaterThan(case13.inputs.target_mg_l.Fe * 0.95);
    const range: Record<string, number> = { B: 0.5, Mn: 1, Zn: 0.5, Cu: 0.1, Mo: 0.05 };
    for (const [g, top] of Object.entries(range)) expect(a[g] ?? 0).toBeLessThanOrEqual(top + 1e-9);
    expect(a.Ca ?? 0).toBeGreaterThan(case13.inputs.target_mg_l.Ca * 0.6);
  });
});

describe('rounding to the 0.001 dose grid', () => {
  it('a micro mix on an active Fe cap still reaches the best grid point (scipy reference 0.234357)', () => {
    const pick = (caseId: string, name: string) => specs(goldenCase(caseId)).find((f) => f.name === name)!;
    const fertilizers = [
      pick('case06_samosa_grow2_an_ph', 'pH Perfect Grow'),
      pick('case04_olk_veg_salts', 'Калий сернокислый (сульфат калия)'),
      pick('case01_ghe_w2_flora3', 'FloraGro'),
      pick('case04_olk_veg_salts', 'Кальциевая селитра'),
      pick('case09_ghe_w2_floraduo', 'FloraDuo B'),
      pick('case08_olk_veg_master181818', 'HIDROMIX'),
    ];
    const target = {
      N: 216.188, P: 71.85, K: 184.343, Ca: 19.962, Mg: 48.868, S: 54.692,
      B: 0.251, Fe: 1.539, Mn: 0.758, Zn: 0.349, Cu: 0.264, Mo: 0.042, Co: 0.008,
    };
    const r = solveForward({
      target,
      fertilizers,
      options: {
        model: 'hydroodo_legacy',
        overdosePctByGroup: goldenCase('case04_olk_veg_salts').inputs.overdose_pct,
        microOverdoseCap: 'hard',
      },
    });
    const achieved = r.best.achievedPpm as Record<string, number>;
    const groups = [...new Set([...Object.keys(achieved), ...Object.keys(target)])];
    expect(computeObjective(groups, target, achieved)).toBeLessThanOrEqual(0.234357 + 1e-6);
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

  it('shown ppm equals a reverse solve of the shown doses (no hidden sub-floor lines)', () => {
    for (const fertilizers of [specs(case04), broadSelection()]) {
      const byId = new Map(fertilizers.map((f) => [f.id, f]));
      const result = solveMagicWand({ target: case04.inputs.target_mg_l, fertilizers, options });
      for (const sol of [result.best, ...result.alternatives]) {
        for (const d of sol.doses) {
          const floor = isMicroCarrier(byId.get(d.fertilizerId)!, 'hydroodo_legacy') ? 0.001 : 0.01;
          expect(d.amountPerL).toBeGreaterThanOrEqual(floor - 1e-9);
        }
        expectPpmMatchesDoses(sol, fertilizers, 'hydroodo_legacy');
      }
    }
  });

  it('keeps a mg-scale micro mix instead of dropping all micros', () => {
    const result = solveMagicWand({
      target: case04.inputs.target_mg_l,
      fertilizers: specs(case04),
      options,
    });
    const mix = result.best.doses.find((d) => d.fertilizerName === 'Аквамикс');
    expect(mix?.amountPerL ?? 0).toBeGreaterThan(0);
    expect(mix!.amountPerL).toBeLessThan(0.01);
    expect((result.best.achievedPpm as Record<string, number>).Fe ?? 0).toBeGreaterThan(0);
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
