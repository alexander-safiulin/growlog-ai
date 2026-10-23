import type { ElementKey } from '@growlog/nutrient-calc';

export const NUTRIENT_MACRO_KEYS: ElementKey[] = ['N_NO3', 'N_NH4', 'P', 'K', 'Ca', 'Mg', 'S'];

/** Micronutrients shown when «микроэлементы» column toggle is on. */
export const NUTRIENT_TRACE_MICRO_KEYS: ElementKey[] = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co'];

/** Si, Cl, Na — hidden unless optional-ion toggle is on (solver unchanged). */
export const NUTRIENT_OPTIONAL_ION_KEYS: ElementKey[] = ['Cl', 'Na', 'Si'];

export const NUTRIENT_MICRO_KEYS: ElementKey[] = [
  ...NUTRIENT_TRACE_MICRO_KEYS,
  ...NUTRIENT_OPTIONAL_ION_KEYS,
];

export const NUTRIENT_ALL_ELEMENT_KEYS: ElementKey[] = [...NUTRIENT_MACRO_KEYS, ...NUTRIENT_MICRO_KEYS];

export function nutrientTableElementKeys(options: {
  showMicro: boolean;
  showOptionalIons: boolean;
}): ElementKey[] {
  const keys: ElementKey[] = [...NUTRIENT_MACRO_KEYS];
  if (options.showMicro) keys.push(...NUTRIENT_TRACE_MICRO_KEYS);
  if (options.showOptionalIons) keys.push(...NUTRIENT_OPTIONAL_ION_KEYS);
  return keys;
}
