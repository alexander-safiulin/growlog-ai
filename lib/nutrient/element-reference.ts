/** Standard element reference (IUPAC atomic mass g/mol; common valence for hydroponics UI). */
export const ELEMENT_REFERENCE: Record<string, { atomic_mass: number; valence: number }> = {
  H: { atomic_mass: 1.008, valence: 1 },
  C: { atomic_mass: 12.011, valence: 4 },
  N: { atomic_mass: 14.007, valence: 3 },
  O: { atomic_mass: 15.999, valence: 2 },
  P: { atomic_mass: 30.974, valence: 5 },
  K: { atomic_mass: 39.098, valence: 1 },
  Ca: { atomic_mass: 40.078, valence: 2 },
  Mg: { atomic_mass: 24.305, valence: 2 },
  S: { atomic_mass: 32.06, valence: 2 },
  Na: { atomic_mass: 22.99, valence: 1 },
  Cl: { atomic_mass: 35.45, valence: 1 },
  Fe: { atomic_mass: 55.845, valence: 2 },
  Mn: { atomic_mass: 54.938, valence: 2 },
  Zn: { atomic_mass: 65.38, valence: 2 },
  Cu: { atomic_mass: 63.546, valence: 2 },
  B: { atomic_mass: 10.81, valence: 3 },
  Mo: { atomic_mass: 95.95, valence: 6 },
  Si: { atomic_mass: 28.085, valence: 4 },
  NO3: { atomic_mass: 62.004, valence: 1 },
  NH4: { atomic_mass: 18.039, valence: 1 },
  SO4: { atomic_mass: 96.062, valence: 2 },
  HCO3: { atomic_mass: 61.016, valence: 1 },
};

export function elementMassAndValence(symbol: string): { atomic_mass: number | null; valence: number | null } {
  const row = ELEMENT_REFERENCE[symbol];
  if (!row) return { atomic_mass: null, valence: null };
  return row;
}
