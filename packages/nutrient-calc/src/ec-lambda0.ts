/**
 * Limiting molar ionic conductivities Λ° (25 °C, infinite dilution).
 *
 * All values are **per mole of ion** (S·cm²·mol⁻¹), not per equivalent.
 * Primary reference table: CRC Handbook equivalent/molar conductivity data;
 * cross-check: Colorado State CRC reference PDF (equivalent conductivity of electrolytes).
 *
 * @see https://diverdi.colostate.edu/all_courses/CRC%20reference%20data/equivalent%20conductivity%20of%20electrolytes.pdf
 */
export interface IonicConductivityEntry {
  ion: string;
  z: number;
  lambda0Scm2PerMol: number;
  /** CRC Handbook 97th ed. table / ionic conductivity at infinite dilution. */
  crcTableRef: string;
}

export const CRC_CONDUCTIVITY_PDF =
  'https://diverdi.colostate.edu/all_courses/CRC%20reference%20data/equivalent%20conductivity%20of%20electrolytes.pdf';

/** Lookup key → conductivity entry (keys are internal ion ids). */
export const LAMBDA0_BY_ION: Record<string, IonicConductivityEntry> = {
  H: { ion: 'H+', z: 1, lambda0Scm2PerMol: 349.8, crcTableRef: 'CRC 97th ed. H+' },
  OH: { ion: 'OH-', z: 1, lambda0Scm2PerMol: 198.0, crcTableRef: 'CRC 97th ed. OH-' },
  NO3: { ion: 'NO3-', z: 1, lambda0Scm2PerMol: 71.44, crcTableRef: 'CRC 97th ed. NO3-' },
  NH4: { ion: 'NH4+', z: 1, lambda0Scm2PerMol: 73.5, crcTableRef: 'CRC 97th ed. NH4+' },
  H2PO4: { ion: 'H2PO4-', z: 1, lambda0Scm2PerMol: 36.0, crcTableRef: 'CRC 97th ed. H2PO4-' },
  HPO4: { ion: 'HPO4(2-)', z: 2, lambda0Scm2PerMol: 114.0, crcTableRef: 'CRC 97th ed. HPO4 2-' },
  SO4: { ion: 'SO4(2-)', z: 2, lambda0Scm2PerMol: 160.0, crcTableRef: 'CRC 97th ed. SO4 2-' },
  Cl: { ion: 'Cl-', z: 1, lambda0Scm2PerMol: 76.31, crcTableRef: 'CRC 97th ed. Cl-' },
  K: { ion: 'K+', z: 1, lambda0Scm2PerMol: 73.5, crcTableRef: 'CRC 97th ed. K+' },
  Na: { ion: 'Na+', z: 1, lambda0Scm2PerMol: 50.11, crcTableRef: 'CRC 97th ed. Na+' },
  Ca: { ion: 'Ca2+', z: 2, lambda0Scm2PerMol: 119.0, crcTableRef: 'CRC 97th ed. Ca2+' },
  Mg: { ion: 'Mg2+', z: 2, lambda0Scm2PerMol: 106.1, crcTableRef: 'CRC 97th ed. Mg2+' },
  Fe2: { ion: 'Fe2+', z: 2, lambda0Scm2PerMol: 108.0, crcTableRef: 'CRC 97th ed. Fe2+' },
  Mn2: { ion: 'Mn2+', z: 2, lambda0Scm2PerMol: 107.0, crcTableRef: 'CRC 97th ed. Mn2+' },
  Zn2: { ion: 'Zn2+', z: 2, lambda0Scm2PerMol: 105.6, crcTableRef: 'CRC 97th ed. Zn2+' },
  Cu2: { ion: 'Cu2+', z: 2, lambda0Scm2PerMol: 107.2, crcTableRef: 'CRC 97th ed. Cu2+' },
  MoO4: { ion: 'MoO4(2-)', z: 2, lambda0Scm2PerMol: 149.0, crcTableRef: 'CRC 97th ed. MoO4 2-' },
  HCO3: { ion: 'HCO3-', z: 1, lambda0Scm2PerMol: 44.5, crcTableRef: 'CRC 97th ed. HCO3-' },
};
