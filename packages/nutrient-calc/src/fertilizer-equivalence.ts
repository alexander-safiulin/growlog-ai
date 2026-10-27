import { buildChemistryMatrix, collectGroups, type ChemistryModel } from './chemistry-matrix';
import { classifyFertilizerRoles } from './tanks-ab';
import type { FertilizerSpec } from './types';

const MACRO_KEYS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

const MACRO_TARGET_STUB: Record<string, number> = {
  N: 1,
  P: 1,
  K: 1,
  Ca: 1,
  Mg: 1,
  S: 1,
};

const MICRO_KEYS = ['B', 'Fe', 'Mn', 'Zn', 'Cu', 'Mo', 'Co'] as const;

/**
 * Micro mix that also carries some Ca/Mg (e.g. Ca-EDTA chelate base): its macro is incidental, so it
 * must not collapse with a Ca or Mg salt under role equivalence.
 */
function isMicroCarrier(
  fert: FertilizerSpec,
  macroVec: Record<string, number>,
  model: ChemistryModel,
): boolean {
  const stub = Object.fromEntries(MICRO_KEYS.map((k) => [k, 1]));
  const groups = collectGroups([fert], stub, model);
  const A = buildChemistryMatrix([fert], groups, model);
  let micro = 0;
  for (let i = 0; i < groups.length; i++) {
    if ((MICRO_KEYS as readonly string[]).includes(groups[i])) micro += A[i]?.[0] ?? 0;
  }
  const macro = Object.values(macroVec).reduce((s, v) => s + v, 0);
  return micro > 0 && micro >= macro;
}

/** Element contribution per 1 g/L product (canonical macro groups). */
export function fertilizerMacroContributionVector(
  fert: FertilizerSpec,
  model: ChemistryModel = 'canonical',
): Record<string, number> {
  const groups = collectGroups([fert], MACRO_TARGET_STUB, model);
  const A = buildChemistryMatrix([fert], groups, model);
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!MACRO_KEYS.includes(g as (typeof MACRO_KEYS)[number])) continue;
    const v = A[i]?.[0] ?? 0;
    if (v > 0.5) out[g] = v;
  }
  return out;
}

function dominantMacroRoleKey(vec: Record<string, number>): string | null {
  const entries = MACRO_KEYS.map((k) => [k, vec[k] ?? 0] as const).filter(([, v]) => v > 0.5);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [topK, topV] = sorted[0];
  if (topV / total >= 0.72) return `dom:${topK}`;
  if (entries.length === 2) {
    const [a, b] = entries.map(([k]) => k).sort();
    return `pair:${a},${b}`;
  }
  return `set:${entries.map(([k]) => k).sort().join(',')}`;
}

/**
 * Stable identity for role-equivalent products (proportional macro vectors or same dominant macro role).
 */
export function fertilizerRoleEquivalenceKey(
  fert: FertilizerSpec,
  model: ChemistryModel = 'canonical',
): string {
  const vec = fertilizerMacroContributionVector(fert, model);
  const active = MACRO_KEYS.filter((k) => (vec[k] ?? 0) > 0.5);
  if (active.length === 0) {
    const roles = classifyFertilizerRoles(fert);
    const ion = [
      roles.providesCalcium ? 'Ca-ion' : '',
      roles.providesPhosphate ? 'P-ion' : '',
      roles.providesSulfate ? 'S-ion' : '',
    ]
      .filter(Boolean)
      .join('+');
    return ion ? `ion:${ion}` : `id:${fert.id}`;
  }
  if (isMicroCarrier(fert, vec, model)) return `id:${fert.id}`;
  const min = Math.min(...active.map((k) => vec[k]!));
  const ratios = active
    .map((k) => `${k}:${Math.round((vec[k]! / min) * 4) / 4}`)
    .sort()
    .join(',');
  const dom = dominantMacroRoleKey(vec);
  return dom ? `eq:${ratios}|${dom}` : `eq:${ratios}`;
}

export function fertilizersShareRoleEquivalence(
  a: FertilizerSpec,
  b: FertilizerSpec,
  model: ChemistryModel = 'canonical',
): boolean {
  if (a.id === b.id) return true;
  return fertilizerRoleEquivalenceKey(a, model) === fertilizerRoleEquivalenceKey(b, model);
}

export function subsetHasDuplicateRoleEquivalents(
  subset: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
): boolean {
  const seen = new Set<string>();
  for (const f of subset) {
    const k = fertilizerRoleEquivalenceKey(f, model);
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

export function solutionHasDuplicateRoleEquivalents(
  doses: Array<{ fertilizerId: string; amountPerL: number }>,
  fertilizers: FertilizerSpec[],
  model: ChemistryModel = 'canonical',
  minDoseGPerL = 0.01,
): boolean {
  const byId = new Map(fertilizers.map((f) => [f.id, f]));
  const seen = new Set<string>();
  for (const d of doses) {
    if (d.amountPerL < minDoseGPerL) continue;
    const f = byId.get(d.fertilizerId);
    if (!f) continue;
    const k = fertilizerRoleEquivalenceKey(f, model);
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}
