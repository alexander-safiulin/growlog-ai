import type { ElementKey, ToleranceOptions } from './types';

/** Hydroodo `overdose.xml` defaults (max above-target fraction). */
export const HYDROODO_OVERDOSE_DEFAULTS: Partial<Record<ElementKey, number>> = {
  N_NO3: 0.2,
  N_NH4: 0.2,
  N_UREA: 0.2,
  P: 0.2,
  K: 0.2,
  Ca: 0.3,
  Mg: 0.3,
  S: 0.3,
  B: 0.5,
  Fe: 0.5,
  Mn: 0.5,
  Zn: 0.5,
  Cu: 0.5,
  Mo: 0.5,
  Co: 0.5,
  Na: 0.5,
  Cl: 0.5,
  Si: 0.5,
};

export const DEFAULT_ELEMENT_WEIGHTS: Partial<Record<ElementKey, number>> = {
  N_NO3: 3,
  N_NH4: 3,
  N_UREA: 2,
  P: 3,
  K: 3,
  Ca: 2,
  Mg: 2,
  S: 1.5,
  Fe: 1,
  Mn: 1,
  Zn: 1,
  Cu: 1,
  B: 1,
  Mo: 1,
};

export function resolveOverdosePct(
  element: ElementKey,
  options?: ToleranceOptions,
): number {
  const custom = options?.overdosePct?.[element];
  if (custom != null) return custom;
  const group = element.startsWith('N_') ? HYDROODO_OVERDOSE_DEFAULTS.N_NO3 : HYDROODO_OVERDOSE_DEFAULTS[element];
  return group ?? 0.5;
}

const ASSEMBLE_UNDERDOSE_FRACTION = 0.1;
const ASSEMBLE_UNDERDOSE_KEYS = new Set<string>(['N', 'N_NO3', 'N_NH4', 'N_UREA', 'P', 'K', 'Ca', 'Mg']);

/** N, P, K, Ca and Mg are short below 90% of target. Sulfur keeps the wider overdose corridor. */
export function resolveUnderdosePct(
  element: ElementKey,
  options?: ToleranceOptions,
): number {
  const custom = options?.underdosePct?.[element];
  if (custom != null) return custom;
  if (ASSEMBLE_UNDERDOSE_KEYS.has(element)) return ASSEMBLE_UNDERDOSE_FRACTION;
  return resolveOverdosePct(element, options);
}

export function resolveWeight(element: ElementKey, options?: ToleranceOptions): number {
  return options?.weights?.[element] ?? DEFAULT_ELEMENT_WEIGHTS[element] ?? 1;
}
