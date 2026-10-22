/**
 * Map Hydroodo / catalog declared compositions to hydrate solubility keys (`tanks-ab`).
 * Signatures cite Hoagland & Arnon (1950) open salt tables and CRC stoichiometry.
 */

export interface SolubilitySaltSignature {
  solubilityKey: string;
  /** Declared form keys (Hydroodo-style) → typical % w/w. */
  declaredPct: Record<string, number>;
  citation: string;
}

/** Published single-salt declared % (same basis as `classics.json` catalog recipes). */
export const SOLUBILITY_SALT_SIGNATURES: SolubilitySaltSignature[] = [
  {
    solubilityKey: 'KNO3',
    declaredPct: { NO3: 13.86, K: 38.67 },
    citation: 'Hoagland & Arnon (1950) KNO3 salt table',
  },
  {
    solubilityKey: 'Ca(NO3)2·4H2O',
    declaredPct: { NO3: 11.86, Ca: 16.98 },
    citation: 'Hoagland & Arnon (1950) calcium nitrate tetrahydrate',
  },
  {
    solubilityKey: 'MgSO4·7H2O',
    declaredPct: { S: 13.01, Mg: 9.86 },
    citation: 'Hoagland & Arnon (1950) magnesium sulfate heptahydrate',
  },
  {
    solubilityKey: 'KH2PO4',
    declaredPct: { P: 22.76, K: 28.73 },
    citation: 'Hoagland & Arnon (1950) monopotassium phosphate',
  },
  {
    solubilityKey: 'NaH2PO4·2H2O',
    declaredPct: { P: 19.85, Na: 14.74 },
    citation: 'Hewitt (1966) Table 30A sodium dihydrogen phosphate dihydrate',
  },
  {
    solubilityKey: 'K2SO4',
    declaredPct: { K2O: 53, S: 18 },
    citation: 'Typical K2SO4 fertilizer grade (K2O + S)',
  },
  {
    solubilityKey: 'Mg(NO3)2·6H2O',
    declaredPct: { NO3: 10.9, Mg: 15.7 },
    citation: 'Hydroodo Буйские Магниевая селитра label; Mg(NO3)2·6H2O stoichiometry',
  },
  {
    solubilityKey: 'NH4NO3',
    declaredPct: { NH4: 17.5, NO3: 17.5 },
    citation: 'NH4NO3 50% N as equal NH4/NO3 forms',
  },
  {
    solubilityKey: 'MgSO4·7H2O',
    declaredPct: { MgO: 16.4, S: 13.5 },
    citation: 'Hydroodo Буйские сульфат магния (MgO + S label)',
  },
];

/** Manual overrides when label composition is ambiguous but product identity is known. */
export const SOLUBILITY_KEY_BY_EXTERNAL_KEY: Record<string, string> = {
  'буйские удобрения|кальциевая селитра': 'Ca(NO3)2·4H2O',
  'буйские удобрения|сульфат калия': 'K2SO4',
  'буйские удобрения|магниевая селитра': 'Mg(NO3)2·6H2O',
  'буйские удобрения|монофосфат калия': 'KH2PO4',
  'буйские удобрения|сульфат магния': 'MgSO4·7H2O',
};

const MATCH_REL_TOL = 0.06;

function declaredMatchScore(
  observed: Record<string, number>,
  signature: Record<string, number>,
): number | null {
  const keys = Object.keys(signature);
  if (keys.length === 0) return null;
  let maxRel = 0;
  for (const k of keys) {
    const o = observed[k];
    if (o == null || o <= 0) return null;
    const rel = Math.abs(o - signature[k]) / signature[k];
    maxRel = Math.max(maxRel, rel);
  }
  const extra = Object.keys(observed).filter((k) => (observed[k] ?? 0) > 0 && signature[k] == null);
  if (extra.length > 0) return null;
  return maxRel;
}

/**
 * Infer solubility hydrate key from declared composition and/or external_key.
 */
export function inferSolubilityKeyFromDeclaredPct(
  declaredPct: Record<string, number>,
  externalKey?: string,
): string | undefined {
  const ek = externalKey?.trim().toLowerCase();
  if (ek && SOLUBILITY_KEY_BY_EXTERNAL_KEY[ek]) {
    return SOLUBILITY_KEY_BY_EXTERNAL_KEY[ek];
  }

  let bestKey: string | undefined;
  let bestRel = Infinity;
  for (const sig of SOLUBILITY_SALT_SIGNATURES) {
    const rel = declaredMatchScore(declaredPct, sig.declaredPct);
    if (rel == null || rel > MATCH_REL_TOL) continue;
    if (rel < bestRel) {
      bestRel = rel;
      bestKey = sig.solubilityKey;
    }
  }
  return bestKey;
}
