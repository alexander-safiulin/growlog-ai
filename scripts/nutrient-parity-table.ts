import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  collectGroups,
  computeObjective,
  DEFAULT_SOLVER_OBJECTIVE,
  solveForward,
  solveReverseHydroodo,
  weightedMacroDeviation,
  withinOverdoseCaps,
} from '@growlog/nutrient-calc';

const golden = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests/fixtures/nutrient-golden/hydroodo/cases.json'), 'utf8'),
) as {
  cases: Array<{
    id: string;
    inputs: {
      target_mg_l: Record<string, number>;
      overdose_pct: Record<string, number>;
      min_match_pct: number;
      fertilizers: Array<{ brand: string; name: string; declared_pct: Record<string, number> }>;
    };
    outputs: { status: string; doses_g_or_ml_per_l?: Array<{ name: string; dose: number }> };
  }>;
};
const reference = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests/fixtures/nutrient-golden/reference-optima.json'), 'utf8'),
) as { cases: Record<string, { objective: number | null }> };

function toFert(
  f: { brand: string; name: string; declared_pct: Record<string, number> },
  i: number,
) {
  return {
    id: `${f.brand}|${f.name}|${i}`,
    brand: f.brand,
    name: f.name,
    physicalForm: 'liquid' as const,
    doseUnit: 'ml_per_L' as const,
    declaredPct: f.declared_pct,
    elementalPct: {},
  };
}

const rows: Array<Record<string, string | number>> = [];

for (const case_ of golden.cases) {
  if (case_.outputs.status !== 'ok') continue;
  const target = case_.inputs.target_mg_l;
  const fertByName = new Map(
    case_.inputs.fertilizers.map((f) => [f.name, f.declared_pct] as const),
  );
  const hydro = solveReverseHydroodo(
    (case_.outputs.doses_g_or_ml_per_l ?? []).map((d) => ({
      declaredPct: fertByName.get(d.name)!,
      dosePerL: d.dose,
    })),
  );
  const hydroObj = computeObjective(
    collectGroups(case_.inputs.fertilizers.map(toFert), target, 'hydroodo_legacy'),
    target,
    hydro,
    DEFAULT_SOLVER_OBJECTIVE,
  );
  const hydroFeasible = withinOverdoseCaps(target, hydro, case_.inputs.overdose_pct);

  const t0 = performance.now();
  const ours = solveForward({
    target,
    fertilizers: case_.inputs.fertilizers.map(toFert),
    options: {
      model: 'hydroodo_legacy',
      overdosePctByGroup: case_.inputs.overdose_pct,
      minMatchPct: case_.inputs.min_match_pct,
      doseDecimals: 3,
    },
  });
  const ms = Math.round(performance.now() - t0);
  const groups = collectGroups(case_.inputs.fertilizers.map(toFert), target, 'hydroodo_legacy');
  const ourObj = computeObjective(groups, target, ours.best.achievedPpm, DEFAULT_SOLVER_OBJECTIVE);
  const refObj = reference.cases[case_.id]?.objective ?? 0;

  rows.push({
    case: case_.id,
    hydro_obj: Math.round(hydroObj * 1e4) / 1e4,
    hydro_feasible: hydroFeasible ? 'yes' : 'no',
    our_obj: Math.round(ourObj * 1e4) / 1e4,
    ref_obj: Math.round(refObj * 1e4) / 1e4,
    our_wmd: Math.round(weightedMacroDeviation(target, ours.best.achievedPpm) * 1e4) / 1e4,
    ms,
  });
}

console.table(rows);
