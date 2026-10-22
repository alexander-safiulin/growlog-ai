/**
 * Sulfate ion pairing for divalent cations (MSO4⁰).
 *
 * Association constants as log10 K (mol/L, 25 °C) from sulfate speciation literature:
 * - Connick & Reasenberg, Inorg. Chem. 1962 (Ca²⁺, Mg²⁺ sulfates).
 * - Smith & Martell, Critical Stability Constants Vol. 4 (1976).
 * Typical log10 K ≈ 2.2–2.4 for Mg/Ca/Zn/Cu sulfates at ionic strength ~0.
 */

export interface SulfatePairConstant {
  cationId: string;
  log10K: number;
  citation: string;
}

export const SULFATE_ION_PAIR_LOG10_K: SulfatePairConstant[] = [
  { cationId: 'Mg', log10K: 2.25, citation: 'Connick & Reasenberg 1962; Smith & Martell 1976 MgSO4' },
  { cationId: 'Ca', log10K: 2.3, citation: 'Connick & Reasenberg 1962; Smith & Martell 1976 CaSO4' },
  { cationId: 'Zn2', log10K: 2.35, citation: 'Smith & Martell 1976 ZnSO4' },
  { cationId: 'Cu2', log10K: 2.35, citation: 'Smith & Martell 1976 CuSO4' },
];

/** Davies equation (1929), extended Debye–Hückel: log10 γ = -A z² √I / (1 + √I), A≈0.51 at 25 °C. */
export function daviesActivityCoefficient(z: number, ionicStrength: number): number {
  if (ionicStrength <= 0) return 1;
  const sqrtI = Math.sqrt(ionicStrength);
  const logGamma = (-0.51 * z * z * sqrtI) / (1 + sqrtI);
  return Math.pow(10, logGamma);
}

/**
 * Paired mol/L for M²⁺ + SO₄²⁻ → MSO₄⁰ with K = γ²[M][SO4]/[pair].
 * Solve K γ² (c-p)² = p for p ∈ [0,c].
 */
export function pairedMolPerLWithDavies(
  cMolar: number,
  log10K: number,
  ionicStrength: number,
): number {
  if (cMolar <= 0) return 0;
  const K = Math.pow(10, log10K);
  const gamma = daviesActivityCoefficient(2, ionicStrength);
  const Kapp = K * gamma * gamma;
  const c = cMolar;
  const disc = 1 + 4 * Kapp * c;
  if (disc < 0) return 0;
  const u = (-1 + Math.sqrt(disc)) / (2 * Kapp);
  const p = c - u;
  return Math.max(0, Math.min(p, c));
}

export interface IonPairingResult {
  freeMolPerL: Map<string, number>;
  warnings: string[];
}

export function applySulfateIonPairing(
  ions: Array<{ id: string; cMolPerL: number }>,
  ionicStrengthBeforePairing: number,
): IonPairingResult {
  const free = new Map<string, number>();
  for (const { id, cMolPerL } of ions) {
    free.set(id, (free.get(id) ?? 0) + cMolPerL);
  }
  const warnings: string[] = [];
  const so4 = free.get('SO4') ?? 0;
  if (so4 <= 1e-12) return { freeMolPerL: free, warnings };

  let pairedAny = false;
  for (const { cationId, log10K, citation } of SULFATE_ION_PAIR_LOG10_K) {
    const cCat = free.get(cationId) ?? 0;
    if (cCat <= 1e-12) continue;
    const cMin = Math.min(cCat, so4);
    const p = pairedMolPerLWithDavies(cMin, log10K, ionicStrengthBeforePairing);
    if (p > 1e-9) {
      pairedAny = true;
      free.set(cationId, cCat - p);
      free.set('SO4', (free.get('SO4') ?? 0) - p);
      void citation;
    }
  }
  if (pairedAny && so4 > 0.002) {
    warnings.push('ec_sulfate_ion_pairing_applied');
  }
  return { freeMolPerL: free, warnings };
}
