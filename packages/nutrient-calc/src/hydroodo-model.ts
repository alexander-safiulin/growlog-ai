import type { DeclaredComposition } from './types';

/** Element groups used by Hydroodo 0.4b (elements.xml → group). */
export type HydroodoGroup =
  | 'N'
  | 'P'
  | 'K'
  | 'Ca'
  | 'Mg'
  | 'S'
  | 'B'
  | 'Fe'
  | 'Mn'
  | 'Zn'
  | 'Cu'
  | 'Mo'
  | 'Co'
  | 'Na'
  | 'Cl'
  | 'I'
  | 'Ni'
  | 'Se'
  | 'Br'
  | 'Al'
  | 'V'
  | 'W'
  | 'Li';

export interface HydroodoFormMeta {
  factor: number;
  group: HydroodoGroup;
}

/**
 * Hydroodo database form metadata (elements.xml).
 * Effective multiplier: `(factor_to_element || 1) × 10 × dose × declared%`.
 */
export const HYDROODO_FORM_META: Record<string, HydroodoFormMeta> = {
  NO3: { factor: 0, group: 'N' },
  NH2: { factor: 0, group: 'N' },
  NH4: { factor: 0, group: 'N' },
  P2O5: { factor: 0.436, group: 'P' },
  K2O: { factor: 0.83, group: 'K' },
  N: { factor: 0, group: 'N' },
  P: { factor: 0, group: 'P' },
  K: { factor: 0, group: 'K' },
  Ca: { factor: 0, group: 'Ca' },
  Mg: { factor: 0, group: 'Mg' },
  S: { factor: 0, group: 'S' },
  B: { factor: 0, group: 'B' },
  Fe: { factor: 0, group: 'Fe' },
  Mn: { factor: 0, group: 'Mn' },
  Zn: { factor: 0, group: 'Zn' },
  Cu: { factor: 0, group: 'Cu' },
  Mo: { factor: 0, group: 'Mo' },
  Co: { factor: 0, group: 'Co' },
  CaO: { factor: 0.715, group: 'Ca' },
  MgO: { factor: 0.603, group: 'Mg' },
  SO3: { factor: 0.4, group: 'S' },
  SO4: { factor: 0.33, group: 'S' },
  MgSO4: { factor: 0.2, group: 'Mg' },
  'MgSO4*7H2O': { factor: 0.099, group: 'Mg' },
  'K(NO3)': { factor: 0.39, group: 'K' },
  CaCO3: { factor: 0.4, group: 'Ca' },
  'Ca(NO3)': { factor: 0.17, group: 'Ca' },
  Na: { factor: 0, group: 'Na' },
  Na2O: { factor: 0.56, group: 'Na' },
  Cl: { factor: 0, group: 'Cl' },
  I: { factor: 0, group: 'I' },
  Ni: { factor: 0, group: 'Ni' },
  Se: { factor: 0, group: 'Se' },
  Br: { factor: 0, group: 'Br' },
  Al: { factor: 0, group: 'Al' },
  V: { factor: 0, group: 'V' },
  W: { factor: 0, group: 'W' },
  Li: { factor: 0, group: 'Li' },
};

export function hydroodoEffectiveFactor(formKey: string): number {
  const meta = HYDROODO_FORM_META[formKey];
  if (!meta) return 1;
  return meta.factor === 0 ? 1 : meta.factor;
}

export function hydroodoGroupForForm(formKey: string): HydroodoGroup | null {
  return HYDROODO_FORM_META[formKey]?.group ?? null;
}

export interface HydroodoDoseResult {
  groupsMgL: Partial<Record<HydroodoGroup, number>>;
  nFormsMgL: { NO3: number; NH4: number; NH2: number };
}

/**
 * Hydroodo GUI forward model (confirmed on 14 golden cases):
 * `mg/L(group) += dose × declared% × effectiveFactor(form) × 10`
 * N-form masses for display: `dose × declared% × 10` on NO3/NH4/NH2 keys.
 */
export function hydroodoContributionsFromDose(
  declared: DeclaredComposition,
  dosePerL: number,
): HydroodoDoseResult {
  const groupsMgL: Partial<Record<HydroodoGroup, number>> = {};
  const nFormsMgL = { NO3: 0, NH4: 0, NH2: 0 };

  for (const [key, pct] of Object.entries(declared)) {
    if (pct == null || pct === 0) continue;
    const meta = HYDROODO_FORM_META[key];
    if (!meta) continue;

    const factor = hydroodoEffectiveFactor(key);
    const contrib = dosePerL * pct * factor * 10;
    groupsMgL[meta.group] = (groupsMgL[meta.group] ?? 0) + contrib;

    if (key === 'NO3' || key === 'NH4' || key === 'NH2') {
      nFormsMgL[key] += dosePerL * pct * 10;
    }
  }

  return { groupsMgL, nFormsMgL };
}

export function hydroodoSumDoses(
  items: Array<{ declared: DeclaredComposition; dosePerL: number }>,
): HydroodoDoseResult {
  const groupsMgL: Partial<Record<HydroodoGroup, number>> = {};
  const nFormsMgL = { NO3: 0, NH4: 0, NH2: 0 };

  for (const item of items) {
    const part = hydroodoContributionsFromDose(item.declared, item.dosePerL);
    for (const [g, v] of Object.entries(part.groupsMgL)) {
      const group = g as HydroodoGroup;
      groupsMgL[group] = (groupsMgL[group] ?? 0) + (v ?? 0);
    }
    nFormsMgL.NO3 += part.nFormsMgL.NO3;
    nFormsMgL.NH4 += part.nFormsMgL.NH4;
    nFormsMgL.NH2 += part.nFormsMgL.NH2;
  }

  return { groupsMgL, nFormsMgL };
}

export const HYDROODO_MACRO_GROUPS: HydroodoGroup[] = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];

export function buildHydroodoMatrix(
  fertilizers: Array<{ declaredPct: DeclaredComposition }>,
  groups: string[],
): number[][] {
  const rows = groups.length;
  const cols = fertilizers.length;
  const A: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let j = 0; j < cols; j++) {
    const declared = fertilizers[j].declaredPct;
    for (const [key, pct] of Object.entries(declared)) {
      if (pct == null || pct === 0) continue;
      const meta = HYDROODO_FORM_META[key];
      if (!meta) continue;
      const row = groups.indexOf(meta.group);
      if (row < 0) continue;
      const factor = hydroodoEffectiveFactor(key);
      A[row][j] += pct * factor * 10;
    }
  }
  return A;
}
