/**
 * Limiting molar ionic conductivities Λ° (25 °C, infinite dilution).
 *
 * Values are standard reference data (S·cm²·mol⁻¹), not taken from GPL HydroBuddy.
 * Primary references:
 * - CRC Handbook of Chemistry and Physics, 97th ed., aqueous ionic conductivities table.
 * - A. L. Horvath, Handbook of Aqueous Electrolyte Solutions (1985).
 * - Kohlrausch / Robinson & Stokes for common nutrient ions.
 *
 * Used by LMCv2-style EC model (see ec-lmcv2.ts, ADR-014).
 */
export interface IonicConductivityEntry {
  /** Ion formula for documentation (e.g. NO3-, Ca2+). */
  ion: string;
  /** Charge magnitude |z|. */
  z: number;
  /** Λ° at 25 °C in S·cm²·mol⁻¹. */
  lambda0Scm2PerMol: number;
  citation: string;
}

/** Lookup key → conductivity entry (keys are internal ion ids). */
export const LAMBDA0_BY_ION: Record<string, IonicConductivityEntry> = {
  H: {
    ion: 'H+',
    z: 1,
    lambda0Scm2PerMol: 349.8,
    citation: 'CRC Handbook 97th ed. (H+)',
  },
  OH: {
    ion: 'OH-',
    z: 1,
    lambda0Scm2PerMol: 198.0,
    citation: 'CRC Handbook 97th ed. (OH-)',
  },
  NO3: {
    ion: 'NO3-',
    z: 1,
    lambda0Scm2PerMol: 71.44,
    citation: 'CRC Handbook 97th ed. (NO3-)',
  },
  NH4: {
    ion: 'NH4+',
    z: 1,
    lambda0Scm2PerMol: 73.5,
    citation: 'CRC Handbook 97th ed. (NH4+)',
  },
  H2PO4: {
    ion: 'H2PO4-',
    z: 1,
    lambda0Scm2PerMol: 41.4,
    citation: 'CRC Handbook 97th ed. (H2PO4-)',
  },
  HPO4: {
    ion: 'HPO4(2-)',
    z: 2,
    lambda0Scm2PerMol: 57.0,
    citation: 'CRC Handbook 97th ed. (HPO4 2-)',
  },
  SO4: {
    ion: 'SO4(2-)',
    z: 2,
    lambda0Scm2PerMol: 160.0,
    citation: 'CRC Handbook 97th ed. (SO4 2-)',
  },
  Cl: {
    ion: 'Cl-',
    z: 1,
    lambda0Scm2PerMol: 76.31,
    citation: 'CRC Handbook 97th ed. (Cl-)',
  },
  K: {
    ion: 'K+',
    z: 1,
    lambda0Scm2PerMol: 73.5,
    citation: 'CRC Handbook 97th ed. (K+)',
  },
  Na: {
    ion: 'Na+',
    z: 1,
    lambda0Scm2PerMol: 50.11,
    citation: 'CRC Handbook 97th ed. (Na+)',
  },
  Ca: {
    ion: 'Ca2+',
    z: 2,
    lambda0Scm2PerMol: 59.5,
    citation: 'CRC Handbook 97th ed. (Ca2+)',
  },
  Mg: {
    ion: 'Mg2+',
    z: 2,
    lambda0Scm2PerMol: 53.06,
    citation: 'CRC Handbook 97th ed. (Mg2+)',
  },
  Fe2: {
    ion: 'Fe2+',
    z: 2,
    lambda0Scm2PerMol: 54.0,
    citation: 'CRC Handbook 97th ed. (Fe2+, approximate chelated trace)',
  },
  Mn2: {
    ion: 'Mn2+',
    z: 2,
    lambda0Scm2PerMol: 53.5,
    citation: 'CRC Handbook 97th ed. (Mn2+)',
  },
  Zn2: {
    ion: 'Zn2+',
    z: 2,
    lambda0Scm2PerMol: 53.8,
    citation: 'CRC Handbook 97th ed. (Zn2+)',
  },
  Cu2: {
    ion: 'Cu2+',
    z: 2,
    lambda0Scm2PerMol: 53.6,
    citation: 'CRC Handbook 97th ed. (Cu2+)',
  },
  MoO4: {
    ion: 'MoO4(2-)',
    z: 2,
    lambda0Scm2PerMol: 74.0,
    citation: 'CRC Handbook 97th ed. (MoO4 2-, trace)',
  },
  HCO3: {
    ion: 'HCO3-',
    z: 1,
    lambda0Scm2PerMol: 44.5,
    citation: 'CRC Handbook 97th ed. (HCO3-)',
  },
};
