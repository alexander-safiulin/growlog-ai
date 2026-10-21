import type { ElementKey } from './types';

/** Atomic masses (g/mol) for unit conversion — IUPAC conventional values. */
export const ATOMIC_MASS: Partial<Record<ElementKey, number>> = {
  N_NO3: 14.007,
  N_NH4: 14.007,
  N_UREA: 14.007,
  P: 30.974,
  K: 39.098,
  Ca: 40.078,
  Mg: 24.305,
  S: 32.06,
  Fe: 55.845,
  Mn: 54.938,
  Zn: 65.38,
  Cu: 63.546,
  B: 10.81,
  Mo: 95.95,
  Co: 58.933,
  Na: 22.99,
  Cl: 35.45,
  Si: 28.085,
};

/** Valence for meq/L (absolute charge magnitude for common nutrient ions). */
export const ELEMENT_VALENCE: Partial<Record<ElementKey, number>> = {
  N_NO3: 1,
  N_NH4: 1,
  N_UREA: 0,
  P: 2,
  K: 1,
  Ca: 2,
  Mg: 2,
  S: 2,
  Fe: 2,
  Mn: 2,
  Zn: 2,
  Cu: 2,
  B: 1,
  Mo: 2,
  Co: 2,
  Na: 1,
  Cl: 1,
  Si: 0,
};

/** ppm (mg/L) → mmol/L */
export function ppmToMmol(element: ElementKey, ppm: number): number {
  const m = ATOMIC_MASS[element];
  if (!m || m <= 0) return 0;
  return ppm / m;
}

/** mmol/L → ppm */
export function mmolToPpm(element: ElementKey, mmol: number): number {
  const m = ATOMIC_MASS[element];
  if (!m) return 0;
  return mmol * m;
}

/** ppm → meq/L */
export function ppmToMeq(element: ElementKey, ppm: number): number {
  const z = ELEMENT_VALENCE[element] ?? 0;
  if (z === 0) return 0;
  return (ppm / (ATOMIC_MASS[element] ?? 1)) * z;
}

export function meqToPpm(element: ElementKey, meq: number): number {
  const z = ELEMENT_VALENCE[element] ?? 0;
  if (z === 0) return 0;
  return (meq / z) * (ATOMIC_MASS[element] ?? 1);
}
