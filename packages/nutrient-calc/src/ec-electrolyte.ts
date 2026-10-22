/**
 * CRC equivalent conductance reference data (independent of LMC implementation).
 * @see https://diverdi.colostate.edu/all_courses/CRC%20reference%20data/equivalent%20conductivity%20of%20electrolytes.pdf
 * Values at 0.01 N, 25 °C (S·cm²·equiv⁻¹).
 */
export const CRC_EQUIVALENT_CONDUCTANCE_001N: Record<
  string,
  { lambdaEq: number; citation: string }
> = {
  KCl: { lambdaEq: 141.2, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  NaCl: { lambdaEq: 118.45, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  KNO3: { lambdaEq: 132.75, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  '1/2CaCl2': { lambdaEq: 120.3, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  '1/2MgCl2': { lambdaEq: 114.49, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  '1/2Na2SO4': { lambdaEq: 112.38, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  ZnSO4: { lambdaEq: 84.87, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
  CuSO4: { lambdaEq: 83.08, citation: 'CRC / Colostate PDF, 0.01 N, 25 °C' },
};

/** κ (mS/cm) = Λ_eq × 0.01 N (CRC table convention for listed electrolytes). */
export function crcEcMsCmAt001N(saltKey: string): number {
  const row = CRC_EQUIVALENT_CONDUCTANCE_001N[saltKey];
  if (!row) throw new Error(`unknown_crc_salt:${saltKey}`);
  return row.lambdaEq * 0.01;
}

/** Molarity (mol/L) of salt giving 0.01 N for CRC table keys. */
export function molarityFor001N(saltKey: string): number {
  switch (saltKey) {
    case '1/2CaCl2':
    case '1/2MgCl2':
    case '1/2Na2SO4':
      return 0.005;
    default:
      return 0.01;
  }
}

const ATOMIC = { K: 39.098, Na: 22.99, Cl: 35.45, NO3: 62.004, Ca: 40.078, Mg: 24.305, S: 32.06, Zn: 65.38, Cu: 63.546 };

/** Elemental ppm (mg/L) for a pure single-salt solution at given molarity. */
export function ppmFromSingleSaltMolarity(
  saltKey: string,
  molarity: number,
): Record<string, number> {
  const ppm = (mw: number, stoich: number) => molarity * stoich * mw * 1000;
  switch (saltKey) {
    case 'KCl':
      return { K: ppm(ATOMIC.K, 1), Cl: ppm(ATOMIC.Cl, 1) };
    case 'NaCl':
      return { Na: ppm(ATOMIC.Na, 1), Cl: ppm(ATOMIC.Cl, 1) };
    case 'KNO3':
      return { K: ppm(ATOMIC.K, 1), N_NO3: ppm(14.007, 1), };
    case '1/2CaCl2':
      return { Ca: ppm(ATOMIC.Ca, 1), Cl: ppm(ATOMIC.Cl, 2) };
    case '1/2MgCl2':
      return { Mg: ppm(ATOMIC.Mg, 1), Cl: ppm(ATOMIC.Cl, 2) };
    case '1/2Na2SO4':
      return { Na: ppm(ATOMIC.Na, 2), S: ppm(ATOMIC.S, 1) };
    case 'ZnSO4':
      return { Zn: ppm(ATOMIC.Zn, 1), S: ppm(ATOMIC.S, 1) };
    case 'CuSO4':
      return { Cu: ppm(ATOMIC.Cu, 1), S: ppm(ATOMIC.S, 1) };
    default:
      throw new Error(`unknown_salt:${saltKey}`);
  }
}

/** CRC key for classic test salts (1:1 electrolytes use formula name). */
export const CRC_SALT_KEYS_001N = [
  'KCl',
  'NaCl',
  'KNO3',
  '1/2CaCl2',
  '1/2MgCl2',
  '1/2Na2SO4',
] as const;
