import { declaredToElemental } from './oxide';
import { hydroodoGroupForForm } from './hydroodo-model';
import type { ChemistryModel, DeclaredComposition, FertilizerSpec } from './types';

export type { ChemistryModel } from './types';

const LEGACY_GROUP_MAP: Record<string, string> = {
  NO3: 'N',
  NH2: 'N',
  NH4: 'N',
  P2O5: 'P',
  K2O: 'K',
  CaO: 'Ca',
  MgO: 'Mg',
  SO3: 'S',
  SO4: 'S',
  MgSO4: 'Mg',
  'MgSO4*7H2O': 'Mg',
  'K(NO3)': 'K',
  CaCO3: 'Ca',
  'Ca(NO3)': 'Ca',
  Na2O: 'Na',
};

const LEGACY_FACTOR: Record<string, number> = {
  P2O5: 0.436,
  K2O: 0.83,
  CaO: 0.715,
  MgO: 0.603,
  SO3: 0.4,
  SO4: 0.33,
  MgSO4: 0.2,
  'MgSO4*7H2O': 0.099,
  'K(NO3)': 0.39,
  CaCO3: 0.4,
  'Ca(NO3)': 0.17,
  Na2O: 0.56,
};

export function legacyGroup(form: string): string {
  return LEGACY_GROUP_MAP[form] ?? hydroodoGroupForForm(form) ?? form;
}

export function legacyFactor(form: string): number {
  const f = LEGACY_FACTOR[form];
  if (f != null) return f;
  return 1;
}

/**
 * Hydroodo legacy row build (matches reference opt.py):
 * each declared key maps to a group; N, NO3, NH4, NH2 all sum into N row.
 * Products with total N **and** forms (e.g. FloraDuo BLOOM) therefore **stack**
 * contributions — same as Hydroodo database + GUI reference solver.
 */
export function legacyDeclaredLines(
  declared: DeclaredComposition,
): Array<{ group: string; mgPerLPerUnit: number }> {
  const lines: Array<{ group: string; mgPerLPerUnit: number }> = [];
  for (const [form, pct] of Object.entries(declared)) {
    if (pct == null || pct === 0) continue;
    const group = legacyGroup(form);
    const factor = legacyFactor(form);
    lines.push({ group, mgPerLPerUnit: pct * factor * 10 });
  }
  return lines;
}

function canonicalDeclaredLines(
  declared: DeclaredComposition,
): Array<{ group: string; mgPerLPerUnit: number }> {
  const { pct, warnings } = declaredToElemental(declared);
  const lines: Array<{ group: string; mgPerLPerUnit: number }> = [];
  const unknown = warnings.includes('nitrogen_form_unknown');

  if (unknown && (pct.N_NO3 ?? 0) > 0) {
    const n = ((pct.N_NO3 ?? 0) / 100) * 1000;
    lines.push({ group: 'N_UNKNOWN', mgPerLPerUnit: n });
    lines.push({ group: 'N', mgPerLPerUnit: n });
    const rest = { ...pct };
    delete rest.N_NO3;
    for (const [key, val] of Object.entries(rest)) {
      if (!val) continue;
      lines.push({ group: key, mgPerLPerUnit: (val / 100) * 1000 });
    }
    return lines;
  }

  for (const [key, val] of Object.entries(pct)) {
    if (!val) continue;
    lines.push({ group: key, mgPerLPerUnit: (val / 100) * 1000 });
  }
  return lines;
}

export function collectGroups(
  fertilizers: FertilizerSpec[],
  target: Record<string, number>,
  model: ChemistryModel,
): string[] {
  const set = new Set<string>();
  for (const [g, v] of Object.entries(target)) {
    if ((v ?? 0) > 0) set.add(g);
  }
  for (const f of fertilizers) {
    const declared = f.declaredPct ?? {};
    const lines =
      model === 'hydroodo_legacy'
        ? legacyDeclaredLines(declared)
        : canonicalDeclaredLines(declared);
    for (const line of lines) set.add(line.group);
  }
  const order = [
    'N',
    'N_NO3',
    'N_NH4',
    'N_UREA',
    'N_UNKNOWN',
    'P',
    'K',
    'Ca',
    'Mg',
    'S',
    'B',
    'Fe',
    'Mn',
    'Zn',
    'Cu',
    'Mo',
    'Co',
    'Na',
    'Cl',
  ];
  return [...order.filter((g) => set.has(g)), ...[...set].filter((g) => !order.includes(g)).sort()];
}

export function buildChemistryMatrix(
  fertilizers: FertilizerSpec[],
  groups: string[],
  model: ChemistryModel,
): number[][] {
  const rows = groups.length;
  const cols = fertilizers.length;
  const A: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let j = 0; j < cols; j++) {
    const declared = fertilizers[j].declaredPct ?? {};
    const lines =
      model === 'hydroodo_legacy'
        ? legacyDeclaredLines(declared)
        : canonicalDeclaredLines(declared);
    for (const line of lines) {
      const i = groups.indexOf(line.group);
      if (i >= 0) A[i][j] += line.mgPerLPerUnit;
    }
  }
  return A;
}

export function nitrogenSplitFromDoses(
  fertilizers: FertilizerSpec[],
  x: number[],
  model: ChemistryModel,
): { nh4: number; nTotal: number; unknown: number } {
  let nh4 = 0;
  let nTotal = 0;
  let unknown = 0;
  for (let j = 0; j < fertilizers.length; j++) {
    if (x[j] <= 0) continue;
    const d = fertilizers[j].declaredPct ?? {};
    const dose = x[j];
    if (model === 'hydroodo_legacy') {
      for (const [form, pct] of Object.entries(d)) {
        if (!pct) continue;
        if (form === 'NH4') nh4 += pct * dose * 10;
        if (['N', 'NO3', 'NH4', 'NH2'].includes(form)) nTotal += pct * legacyFactor(form) * dose * 10;
        if (form === 'N') unknown += pct * dose * 10;
      }
    } else {
      const split = declaredToElemental(d);
      const scale = (dose / 100) * 1000;
      nh4 += (split.pct.N_NH4 ?? 0) * scale;
      nTotal +=
        ((split.pct.N_NO3 ?? 0) + (split.pct.N_NH4 ?? 0) + (split.pct.N_UREA ?? 0)) * scale;
      if (split.warnings.includes('nitrogen_form_unknown')) {
        unknown += (split.pct.N_NO3 ?? 0) * scale;
      }
    }
  }
  return { nh4, nTotal, unknown };
}
