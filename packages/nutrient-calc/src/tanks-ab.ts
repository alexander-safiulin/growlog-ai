import { declaredToElemental } from './oxide';
import type { Dose, FertilizerSpec, TankId } from './types';

export interface StockTankOptions {
  /** Concentration factor vs field solution (e.g. 100 → 1:100). */
  concentrationFactor: number;
  /** Stock tank volume (L); when set with fieldVolumeL, totals are scaled. */
  stockVolumeL?: number;
  /** Field / working solution volume (L). */
  fieldVolumeL?: number;
}

export interface FertilizerIonRoles {
  providesCalcium: boolean;
  providesSulfate: boolean;
  providesPhosphate: boolean;
}

export interface TankAssignment {
  fertilizerId: string;
  tank: TankId;
  reason?: string;
}

export interface StockTankDose extends Dose {
  /** Dose in stock concentrate (g/L or ml/L in stock tank). */
  stockAmountPerL: number;
  stockAmountTotal?: number;
  /** Grams (or ml for liquids) in stock tank when volumes provided. */
  massInStockTank?: number;
}

export interface TankSplitResult {
  tankA: StockTankDose[];
  tankB: StockTankDose[];
  single: StockTankDose[];
  warnings: string[];
  assignments: TankAssignment[];
}

/**
 * Solubility at 20 °C (g salt per 100 g water → approximate g/L water).
 * Sources: CRC Handbook / PubChem reference solubility (rounded, conservative for stock checks).
 */
export const SALT_SOLUBILITY_G_PER_L: Record<string, { gPerL: number; citation: string }> = {
  'Ca(NO3)2·4H2O': { gPerL: 1290, citation: 'CRC Handbook — calcium nitrate tetrahydrate' },
  'KNO3': { gPerL: 316, citation: 'CRC Handbook — potassium nitrate' },
  'MgSO4·7H2O': { gPerL: 710, citation: 'CRC Handbook — epsom salt' },
  'KH2PO4': { gPerL: 250, citation: 'CRC Handbook — monopotassium phosphate' },
  'NaH2PO4·2H2O': { gPerL: 915, citation: 'CRC Handbook — sodium phosphate dibasic dihydrate (approx.)' },
};

const SULFATE_FORMS = new Set(['SO4', 'SO3', 'S', 'MgSO4', 'MgSO4*7H2O']);
const PHOSPHATE_FORMS = new Set(['P', 'P2O5', 'PO4', 'H2PO4', 'HPO4']);
const CALCIUM_FORMS = new Set(['Ca', 'CaO', 'CaCO3', 'Ca(NO3)', 'Ca(NO3)2·4H2O']);

function declaredRoles(declared: FertilizerSpec['declaredPct']): FertilizerIonRoles {
  const roles: FertilizerIonRoles = {
    providesCalcium: false,
    providesSulfate: false,
    providesPhosphate: false,
  };
  if (!declared) return roles;
  for (const [form, pct] of Object.entries(declared)) {
    if (!pct || pct <= 0) continue;
    if (CALCIUM_FORMS.has(form) || form.includes('Ca')) roles.providesCalcium = true;
    if (SULFATE_FORMS.has(form) || form.includes('SO4') || form.includes('SO3'))
      roles.providesSulfate = true;
    if (PHOSPHATE_FORMS.has(form) || form.includes('PO4') || form.includes('P2O'))
      roles.providesPhosphate = true;
  }
  const elemental = declaredToElemental(declared);
  if ((elemental.pct.Ca ?? 0) > 0) roles.providesCalcium = true;
  if ((elemental.pct.S ?? 0) > 0) roles.providesSulfate = true;
  if ((elemental.pct.P ?? 0) > 0) roles.providesPhosphate = true;
  return roles;
}

export function classifyFertilizerRoles(fert: FertilizerSpec): FertilizerIonRoles {
  if (fert.declaredPct) return declaredRoles(fert.declaredPct);
  return {
    providesCalcium: (fert.elementalPct.Ca ?? 0) > 0,
    providesSulfate: (fert.elementalPct.S ?? 0) > 0,
    providesPhosphate: (fert.elementalPct.P ?? 0) > 0,
  };
}

/** Hard A/B rule: Ca must not share a concentrated stock with sulfate or phosphate donors. */
export function assignTankForRoles(roles: FertilizerIonRoles): TankId {
  if (roles.providesCalcium) return 'a';
  if (roles.providesSulfate || roles.providesPhosphate) return 'b';
  return 'single';
}

export function detectStockIncompatibilities(
  fertilizers: FertilizerSpec[],
  doses: Dose[],
): string[] {
  const warnings: string[] = [];
  const byTank = new Map<TankId, FertilizerIonRoles[]>();
  for (const d of doses) {
    const fert = fertilizers.find((f) => f.id === d.fertilizerId);
    if (!fert) continue;
    const tank = d.tank ?? fert.tank ?? assignTankForRoles(classifyFertilizerRoles(fert));
    const roles = classifyFertilizerRoles(fert);
    const list = byTank.get(tank) ?? [];
    list.push(roles);
    byTank.set(tank, list);
  }
  for (const [tank, roleList] of byTank) {
    if (tank === 'single') continue;
    const hasCa = roleList.some((r) => r.providesCalcium);
    const hasSulfate = roleList.some((r) => r.providesSulfate);
    const hasPhosphate = roleList.some((r) => r.providesPhosphate);
    if (hasCa && (hasSulfate || hasPhosphate)) {
      warnings.push(`stock_incompatible_ca_with_sulfate_or_phosphate_tank_${tank}`);
    }
  }
  return warnings;
}

function solubilityKeyForFertilizer(fert: FertilizerSpec): string | undefined {
  const name = fert.name;
  for (const key of Object.keys(SALT_SOLUBILITY_G_PER_L)) {
    if (name.includes(key) || key.includes(name)) return key;
  }
  const metaKey = fert.metadata?.solubility_key;
  if (typeof metaKey === 'string') return metaKey;
  return undefined;
}

export function checkStockSolubility(
  fert: FertilizerSpec,
  stockGramsPerL: number,
): { ok: boolean; limitGPerL?: number; citation?: string } {
  const key = solubilityKeyForFertilizer(fert);
  if (!key) return { ok: true };
  const entry = SALT_SOLUBILITY_G_PER_L[key];
  if (!entry) return { ok: true };
  return {
    ok: stockGramsPerL <= entry.gPerL * 0.95,
    limitGPerL: entry.gPerL,
    citation: entry.citation,
  };
}

export function scaleToStockDoses(
  doses: Dose[],
  fertilizers: FertilizerSpec[],
  stock: StockTankOptions,
): TankSplitResult {
  const warnings: string[] = [];
  const C = stock.concentrationFactor;
  if (C < 1) warnings.push('concentration_factor_below_one');
  const assignments: TankAssignment[] = [];
  const tankA: StockTankDose[] = [];
  const tankB: StockTankDose[] = [];
  const single: StockTankDose[] = [];

  for (const d of doses) {
    const fert = fertilizers.find((f) => f.id === d.fertilizerId);
    if (!fert) continue;
    const roles = classifyFertilizerRoles(fert);
    let tank: TankId = d.tank ?? fert.tank ?? assignTankForRoles(roles);
    if (tank === 'single' && (roles.providesCalcium || roles.providesSulfate || roles.providesPhosphate)) {
      tank = assignTankForRoles(roles);
    }
    assignments.push({ fertilizerId: d.fertilizerId, tank, reason: 'ion_role_ab_rule' });

    const stockAmountPerL = d.amountPerL * C;
    const sol = checkStockSolubility(fert, stockAmountPerL);
    if (!sol.ok) {
      warnings.push(
        `stock_solubility_exceeded:${fert.id}:limit_${sol.limitGPerL}_g_per_L`,
      );
    }

    let stockAmountTotal = d.amountTotal != null ? d.amountTotal * C : undefined;
    let massInStockTank: number | undefined;
    if (stock.stockVolumeL != null && stock.fieldVolumeL != null && stock.fieldVolumeL > 0) {
      const frac = stock.stockVolumeL / stock.fieldVolumeL;
      massInStockTank = d.amountPerL * stock.fieldVolumeL * C * frac;
      stockAmountTotal = massInStockTank;
    }

    const row: StockTankDose = {
      ...d,
      tank,
      stockAmountPerL,
      stockAmountTotal,
      massInStockTank,
    };
    if (tank === 'a') tankA.push(row);
    else if (tank === 'b') tankB.push(row);
    else single.push(row);
  }

  warnings.push(...detectStockIncompatibilities(fertilizers, doses.map((d) => {
    const fert = fertilizers.find((f) => f.id === d.fertilizerId);
    const roles = fert ? classifyFertilizerRoles(fert) : { providesCalcium: false, providesSulfate: false, providesPhosphate: false };
    return {
      ...d,
      tank: d.tank ?? fert?.tank ?? assignTankForRoles(roles),
    };
  })));

  return { tankA, tankB, single, warnings, assignments };
}

/**
 * Apply A/B tank metadata to fertilizer specs before solving (optional pre-split).
 * Ca → tank A; sulfate/phosphate → tank B.
 */
export function applyAbTankHints(fertilizers: FertilizerSpec[]): FertilizerSpec[] {
  return fertilizers.map((f) => {
    if (f.tank && f.tank !== 'single') return f;
    const tank = assignTankForRoles(classifyFertilizerRoles(f));
    return tank === 'single' ? f : { ...f, tank };
  });
}
