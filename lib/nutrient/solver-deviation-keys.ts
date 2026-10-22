import type { ElementKey } from '@growlog/nutrient-calc';

export const NUTRIENT_MACRO_KEYS: ElementKey[] = ['N_NO3', 'N_NH4', 'P', 'K', 'Ca', 'Mg', 'S'];

export const NUTRIENT_MICRO_KEYS: ElementKey[] = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Cl', 'Na', 'Si', 'Co'];

export const NUTRIENT_ALL_ELEMENT_KEYS: ElementKey[] = [...NUTRIENT_MACRO_KEYS, ...NUTRIENT_MICRO_KEYS];
