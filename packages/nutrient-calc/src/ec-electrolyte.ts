import { LAMBDA0_BY_ION } from './ec-lambda0';
import { estimateEcMsCmFromIons, type EcEstimateOptions } from './ec-lmcv2';

/**
 * Equivalent conductance Λ_eq (S·cm²·equiv⁻¹) at 0.01 N, 25 °C.
 * @see https://diverdi.colostate.edu/all_courses/CRC%20reference%20data/equivalent%20conductivity%20of%20electrolytes.pdf
 */
export const CRC_EQUIVALENT_CONDUCTANCE_001N: Record<
  string,
  { lambdaEq: number; citation: string }
> = {
  KCl: { lambdaEq: 126.9, citation: 'CRC via Colostate equiv. conductivity PDF, 0.01 N' },
  NaCl: { lambdaEq: 118.6, citation: 'CRC via Colostate equiv. conductivity PDF, 0.01 N' },
  KNO3: { lambdaEq: 110.9, citation: 'CRC via Colostate equiv. conductivity PDF, 0.01 N' },
  CaCl2: { lambdaEq: 107.5, citation: 'CRC via Colostate equiv. conductivity PDF, 0.01 N' },
  MgCl2: { lambdaEq: 94.7, citation: 'CRC via Colostate equiv. conductivity PDF, 0.01 N' },
  Na2SO4: { lambdaEq: 129.4, citation: 'CRC via Colostate equiv. conductivity PDF, 0.01 N' },
};

/** κ (mS/cm) = Λ_eq × normality (CRC table convention). */
export function crcEcMsCmAt001N(saltKey: string): number {
  const row = CRC_EQUIVALENT_CONDUCTANCE_001N[saltKey];
  if (!row) throw new Error(`unknown_crc_salt:${saltKey}`);
  return row.lambdaEq * 0.01;
}

type ElectrolyteStoich = {
  saltKey: string;
  cations: Array<{ id: string; equivPerFormula: number }>;
  anions: Array<{ id: string; equivPerFormula: number }>;
  /** Normality = molarity_salt × equivalents per formula. */
  normalityFromMolarity: (molarity: number) => number;
};

const ELECTROLYTE_STOICH: Record<string, ElectrolyteStoich> = {
  KCl: {
    saltKey: 'KCl',
    cations: [{ id: 'K', equivPerFormula: 1 }],
    anions: [{ id: 'Cl', equivPerFormula: 1 }],
    normalityFromMolarity: (m) => m,
  },
  NaCl: {
    saltKey: 'NaCl',
    cations: [{ id: 'Na', equivPerFormula: 1 }],
    anions: [{ id: 'Cl', equivPerFormula: 1 }],
    normalityFromMolarity: (m) => m,
  },
  KNO3: {
    saltKey: 'KNO3',
    cations: [{ id: 'K', equivPerFormula: 1 }],
    anions: [{ id: 'NO3', equivPerFormula: 1 }],
    normalityFromMolarity: (m) => m,
  },
  CaCl2: {
    saltKey: 'CaCl2',
    cations: [{ id: 'Ca', equivPerFormula: 2 }],
    anions: [{ id: 'Cl', equivPerFormula: 2 }],
    normalityFromMolarity: (m) => m * 2,
  },
  MgCl2: {
    saltKey: 'MgCl2',
    cations: [{ id: 'Mg', equivPerFormula: 2 }],
    anions: [{ id: 'Cl', equivPerFormula: 2 }],
    normalityFromMolarity: (m) => m * 2,
  },
  Na2SO4: {
    saltKey: 'Na2SO4',
    cations: [{ id: 'Na', equivPerFormula: 2 }],
    anions: [{ id: 'SO4', equivPerFormula: 2 }],
    normalityFromMolarity: (m) => m * 2,
  },
  ZnSO4: {
    saltKey: 'ZnSO4',
    cations: [{ id: 'Zn2', equivPerFormula: 2 }],
    anions: [{ id: 'SO4', equivPerFormula: 2 }],
    normalityFromMolarity: (m) => m * 2,
  },
  CuSO4: {
    saltKey: 'CuSO4',
    cations: [{ id: 'Cu2', equivPerFormula: 2 }],
    anions: [{ id: 'SO4', equivPerFormula: 2 }],
    normalityFromMolarity: (m) => m * 2,
  },
};

function lambda0Sum(stoich: ElectrolyteStoich): number {
  let s = 0;
  for (const c of stoich.cations) {
    s += (LAMBDA0_BY_ION[c.id]?.lambda0Scm2PerMol ?? 0) * c.equivPerFormula;
  }
  for (const a of stoich.anions) {
    s += (LAMBDA0_BY_ION[a.id]?.lambda0Scm2PerMol ?? 0) * a.equivPerFormula;
  }
  return s;
}

/**
 * Shedlovsky-style Λ(N) anchored to CRC Λ_eq at 0.01 N and Λ° sum (CRC ionic Λ°).
 * κ (mS/cm) = Λ(N) × N.
 */
export function shedlovskyEcMsCm(stoich: ElectrolyteStoich, molarity: number): number {
  const crc = CRC_EQUIVALENT_CONDUCTANCE_001N[stoich.saltKey];
  const lambda0 = lambda0Sum(stoich);
  const n = stoich.normalityFromMolarity(molarity);
  if (n <= 0) return 0;
  const nRef = 0.01;
  const lambdaEqRef = crc?.lambdaEq ?? lambda0;
  const sSlope = (lambda0 - lambdaEqRef) / Math.sqrt(nRef);
  const lambdaAtN = lambda0 - sSlope * Math.sqrt(n);
  return lambdaAtN * n;
}

export function estimateElectrolyteEcMsCm(saltKey: string, molarity: number): number {
  const stoich = ELECTROLYTE_STOICH[saltKey];
  if (!stoich) throw new Error(`unknown_electrolyte:${saltKey}`);
  return shedlovskyEcMsCm(stoich, molarity);
}

export function ionsForElectrolyteMolarity(
  saltKey: string,
  molarity: number,
): Array<{ id: string; cMolPerL: number }> {
  const stoich = ELECTROLYTE_STOICH[saltKey];
  if (!stoich) throw new Error(`unknown_electrolyte:${saltKey}`);
  const ions: Array<{ id: string; cMolPerL: number }> = [];
  for (const c of stoich.cations) {
    ions.push({ id: c.id, cMolPerL: molarity * c.equivPerFormula });
  }
  for (const a of stoich.anions) {
    ions.push({ id: a.id, cMolPerL: molarity * a.equivPerFormula });
  }
  return ions;
}

export function estimateBinaryElectrolyteEcMsCm(
  saltKey: string,
  molarity: number,
  options?: EcEstimateOptions,
): number {
  if (options?.ionPairing === false || saltKey in CRC_EQUIVALENT_CONDUCTANCE_001N) {
    return estimateElectrolyteEcMsCm(saltKey, molarity);
  }
  const ions = ionsForElectrolyteMolarity(saltKey, molarity);
  return estimateEcMsCmFromIons(ions, options);
}
