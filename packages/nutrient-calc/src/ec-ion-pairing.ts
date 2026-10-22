/**
 * Ion-pair association correction for 2:2 sulfate electrolytes (MgSO4, CaSO4, ZnSO4, CuSO4).
 *
 * Association constants K (L/mol) at 25 °C — sulfate complexation literature:
 * - R. M. Smith & A. E. Martell, Critical Stability Constants (1976).
 * - Mesmer & Baes, sulfate ion pairing in seawater models.
 */
export interface SulfatePairConstant {
  cationId: string;
  kAssocLPerMol: number;
  citation: string;
}

export const SULFATE_ION_PAIR_CONSTANTS: SulfatePairConstant[] = [
  { cationId: 'Mg', kAssocLPerMol: 90, citation: 'Smith & Martell (1976) MgSO4(aq)' },
  { cationId: 'Ca', kAssocLPerMol: 200, citation: 'Smith & Martell (1976) CaSO4(aq)' },
  { cationId: 'Zn2', kAssocLPerMol: 150, citation: 'Smith & Martell (1976) ZnSO4(aq)' },
  { cationId: 'Cu2', kAssocLPerMol: 180, citation: 'Smith & Martell (1976) CuSO4(aq)' },
];

/** Paired mol/L from 1:1 ion pairing: K = p / (c_free²). */
export function pairedMolPerL(cIon: number, kAssoc: number): number {
  if (cIon <= 0 || kAssoc <= 0) return 0;
  const u =
    (-1 + Math.sqrt(1 + 4 * kAssoc * cIon)) / (2 * kAssoc);
  const p = cIon - u;
  return Math.max(0, Math.min(p, cIon));
}

export interface IonPairingResult {
  /** Ion id → free mol/L after pairing. */
  freeMolPerL: Map<string, number>;
  warnings: string[];
}

export function applySulfateIonPairing(
  ions: Array<{ id: string; cMolPerL: number }>,
): IonPairingResult {
  const free = new Map<string, number>();
  for (const { id, cMolPerL } of ions) {
    free.set(id, (free.get(id) ?? 0) + cMolPerL);
  }
  const warnings: string[] = [];
  const so4 = free.get('SO4') ?? 0;
  if (so4 <= 0) return { freeMolPerL: free, warnings };

  for (const { cationId, kAssocLPerMol, citation } of SULFATE_ION_PAIR_CONSTANTS) {
    const cCat = free.get(cationId) ?? 0;
    if (cCat <= 1e-12) continue;
    const cPair = Math.min(cCat, so4);
    const p = pairedMolPerL(cPair, kAssocLPerMol);
    if (p > 1e-9) {
      free.set(cationId, cCat - p);
      free.set('SO4', (free.get('SO4') ?? 0) - p);
      warnings.push(`ion_pairing_${cationId}_SO4:${citation}`);
    }
  }
  return { freeMolPerL: free, warnings };
}
