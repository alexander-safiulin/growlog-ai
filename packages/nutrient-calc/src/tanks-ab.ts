import { declaredToElemental } from './oxide';
import type { Dose, FertilizerSpec, TankId } from './types';

export interface StockTankOptions {
  concentrationFactor: number;
  stockVolumeL?: number;
  fieldVolumeL?: number;
  /** When true, every salt is assigned to tank A or B (no `single`). */
  twoTankMode?: boolean;
  /** Tank for neutral salts (KNO3, NH4NO3, …) when `twoTankMode` (default B). */
  neutralSaltsTank?: 'a' | 'b';
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
  stockAmountPerL: number;
  stockAmountTotal?: number;
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
 * Solubility at ~20 °C (g salt per L water). Citations: CRC Handbook solubility tables.
 */
export const SALT_SOLUBILITY_G_PER_L: Record<string, { gPerL: number; citation: string }> = {
  'Ca(NO3)2·4H2O': {
    gPerL: 1290,
    citation: 'CRC Handbook 97th ed., calcium nitrate tetrahydrate',
  },
  KNO3: { gPerL: 316, citation: 'CRC Handbook 97th ed., potassium nitrate' },
  'MgSO4·7H2O': { gPerL: 710, citation: 'CRC Handbook 97th ed., magnesium sulfate heptahydrate' },
  KH2PO4: { gPerL: 222, citation: 'CRC Handbook 97th ed., potassium dihydrogen phosphate (~22 g/100 g H2O)' },
  'NaH2PO4·2H2O': {
    gPerL: 610,
    citation: 'CRC Handbook 97th ed., sodium dihydrogen phosphate dihydrate',
  },
  K2SO4: { gPerL: 120, citation: 'CRC Handbook 97th ed., potassium sulfate' },
  NH4NO3: {
    gPerL: 1840,
    citation: 'CRC Handbook 97th ed., NH4NO3 ~184 g/100 g H2O at 20 °C',
  },
  'Mg(NO3)2·6H2O': {
    gPerL: 1250,
    citation: 'CRC Handbook 97th ed., magnesium nitrate hexahydrate (approx.)',
  },
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

export function solubilityKeyForFertilizer(fert: FertilizerSpec): string | undefined {
  const metaKey = fert.metadata?.solubility_key;
  if (typeof metaKey === 'string' && metaKey.length > 0) return metaKey;
  return undefined;
}

export function assignTankForRoles(
  roles: FertilizerIonRoles,
  options?: Pick<StockTankOptions, 'twoTankMode' | 'neutralSaltsTank'>,
): TankId {
  if (roles.providesCalcium) return 'a';
  if (roles.providesSulfate || roles.providesPhosphate) return 'b';
  if (options?.twoTankMode) return options.neutralSaltsTank ?? 'b';
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
    const tank = d.tank ?? fert.tank ?? 'single';
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

export function checkStockSolubility(
  fert: FertilizerSpec,
  stockGramsPerL: number,
): { ok: boolean; limitGPerL?: number; citation?: string; warning?: string } {
  const key = solubilityKeyForFertilizer(fert);
  if (!key) {
    return {
      ok: false,
      warning: `stock_solubility_unknown:${fert.id}`,
    };
  }
  const entry = SALT_SOLUBILITY_G_PER_L[key];
  if (!entry) {
    return {
      ok: false,
      warning: `stock_solubility_unknown_key:${key}`,
    };
  }
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
  const tankOpts = {
    twoTankMode: stock.twoTankMode ?? true,
    neutralSaltsTank: stock.neutralSaltsTank,
  };

  const assignedDoses: Dose[] = [];

  for (const d of doses) {
    const fert = fertilizers.find((f) => f.id === d.fertilizerId);
    if (!fert) continue;
    const roles = classifyFertilizerRoles(fert);
    const tank: TankId =
      d.tank && d.tank !== 'single'
        ? d.tank
        : fert.tank && fert.tank !== 'single'
          ? fert.tank
          : assignTankForRoles(roles, tankOpts);
    assignments.push({ fertilizerId: d.fertilizerId, tank, reason: 'ion_role_ab_rule' });

    const isLiquid = fert.physicalForm === 'liquid' || d.unit === 'ml_per_L';
    const stockAmountPerL = d.amountPerL * C;
    if (!isLiquid) {
      const sol = checkStockSolubility(fert, stockAmountPerL);
      if (sol.warning) warnings.push(sol.warning);
      else if (!sol.ok) {
        warnings.push(`stock_solubility_exceeded:${fert.id}:limit_${sol.limitGPerL}_g_per_L`);
      }
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
    assignedDoses.push(row);
    if (tank === 'a') tankA.push(row);
    else if (tank === 'b') tankB.push(row);
    else single.push(row);
  }

  warnings.push(...detectStockIncompatibilities(fertilizers, assignedDoses));

  return { tankA, tankB, single, warnings, assignments };
}

export function applyAbTankHints(
  fertilizers: FertilizerSpec[],
  options?: Pick<StockTankOptions, 'twoTankMode' | 'neutralSaltsTank'>,
): FertilizerSpec[] {
  const tankOpts = { twoTankMode: true, ...options };
  return fertilizers.map((f) => {
    const tank = assignTankForRoles(classifyFertilizerRoles(f), tankOpts);
    return { ...f, tank };
  });
}
