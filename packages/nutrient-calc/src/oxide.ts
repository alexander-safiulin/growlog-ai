import type { DeclaredComposition, ElementalComposition, ElementKey } from './types';

/** Molar-mass-based oxide → elemental mass factors (canonical; not Hydroodo legacy). */
export const CANONICAL_OXIDE_FACTORS: Record<string, { element: ElementKey; factor: number }> = {
  P2O5: { element: 'P', factor: (2 * 30.974) / 141.945 },
  K2O: { element: 'K', factor: (2 * 39.098) / 94.196 },
  CaO: { element: 'Ca', factor: 40.078 / 56.077 },
  MgO: { element: 'Mg', factor: 24.305 / 40.304 },
  SO3: { element: 'S', factor: 32.06 / 80.06 },
  SO4: { element: 'S', factor: 32.06 / 96.06 },
  /** Hydroodo 0.4b used 0.56; correct factor ≈ 0.7416 (2×22.990 / 61.979). */
  Na2O: { element: 'Na', factor: (2 * 22.99) / 61.979 },
};

/** Legacy erroneous factor kept for documentation / seed rows only. */
export const HYDROODO_LEGACY_NA2O_FACTOR = 0.56;

export const CANONICAL_NA2O_FACTOR = CANONICAL_OXIDE_FACTORS.Na2O.factor;

const DIRECT_ELEMENT_KEYS: ElementKey[] = [
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
  'Si',
];

const N_FORM_KEYS = ['NO3', 'NH4', 'NH2'] as const;

function addPct(
  out: Partial<Record<ElementKey, number>>,
  key: ElementKey,
  value: number,
): void {
  if (!Number.isFinite(value) || value === 0) return;
  out[key] = (out[key] ?? 0) + value;
}

/**
 * Convert label-declared % (forms + oxides) to elemental %.
 * Nitrogen: if total `N` is present, it wins over summing NO3/NH4/NH2 (avoids Hydroodo double-count).
 */
export function declaredToElemental(declared: DeclaredComposition): ElementalComposition {
  const pct: Partial<Record<ElementKey, number>> = {};
  const warnings: string[] = [];

  const totalN = declared.N ?? 0;
  const no3 = declared.NO3 ?? 0;
  const nh4 = declared.NH4 ?? 0;
  const nh2 = declared.NH2 ?? 0;
  const hasForms = no3 > 0 || nh4 > 0 || nh2 > 0;

  if (totalN > 0 && hasForms) {
    warnings.push('nitrogen_total_over_forms');
    addPct(pct, 'N_NO3', no3);
    addPct(pct, 'N_NH4', nh4);
    addPct(pct, 'N_UREA', nh2);
    const formSum = no3 + nh4 + nh2;
    if (formSum > 0 && Math.abs(formSum - totalN) > 0.05) {
      const scale = totalN / formSum;
      if (pct.N_NO3) pct.N_NO3 = (pct.N_NO3 ?? 0) * scale;
      if (pct.N_NH4) pct.N_NH4 = (pct.N_NH4 ?? 0) * scale;
      if (pct.N_UREA) pct.N_UREA = (pct.N_UREA ?? 0) * scale;
    }
  } else if (totalN > 0) {
    warnings.push('nitrogen_form_unknown');
    addPct(pct, 'N_UNKNOWN', totalN);
    addPct(pct, 'N', totalN);
  } else if (hasForms) {
    addPct(pct, 'N_NO3', no3);
    addPct(pct, 'N_NH4', nh4);
    addPct(pct, 'N_UREA', nh2);
  }

  for (const [form, meta] of Object.entries(CANONICAL_OXIDE_FACTORS)) {
    const raw = declared[form];
    if (raw != null && raw > 0) {
      addPct(pct, meta.element, raw * meta.factor);
    }
  }

  for (const key of DIRECT_ELEMENT_KEYS) {
    const raw = declared[key];
    if (raw != null && raw > 0) {
      addPct(pct, key, raw);
    }
  }

  return { pct, warnings };
}

export function oxideFactor(form: string, useLegacyHydroodo = false): number {
  if (form === 'Na2O' && useLegacyHydroodo) return HYDROODO_LEGACY_NA2O_FACTOR;
  const entry = CANONICAL_OXIDE_FACTORS[form];
  return entry?.factor ?? 1;
}

/** Product keys that may appear on labels and participate in conversion. */
export function isNitrogenFormKey(key: string): boolean {
  return key === 'N' || (N_FORM_KEYS as readonly string[]).includes(key);
}
