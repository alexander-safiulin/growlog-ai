/** Canonical elemental keys for targets and achieved solution (ppm as mg/L). */
export type ElementKey =
  | 'N'
  | 'N_NO3'
  | 'N_NH4'
  | 'N_UREA'
  | 'N_UNKNOWN'
  | 'P'
  | 'K'
  | 'Ca'
  | 'Mg'
  | 'S'
  | 'Fe'
  | 'Mn'
  | 'Zn'
  | 'Cu'
  | 'B'
  | 'Mo'
  | 'Co'
  | 'Na'
  | 'Cl'
  | 'Si';

export type TankId = 'single' | 'a' | 'b';

export type DoseUnit = 'g_per_L' | 'ml_per_L';

/** Target or achieved ppm map (missing keys treated as 0). */
export type TargetPpm = Partial<Record<ElementKey, number>>;

export type DeclaredFormKey =
  | 'N'
  | 'NO3'
  | 'NH4'
  | 'NH2'
  | 'P'
  | 'P2O5'
  | 'K'
  | 'K2O'
  | 'Ca'
  | 'CaO'
  | 'Mg'
  | 'MgO'
  | 'S'
  | 'SO3'
  | 'SO4'
  | 'B'
  | 'Fe'
  | 'Mn'
  | 'Zn'
  | 'Cu'
  | 'Mo'
  | 'Co'
  | 'Na'
  | 'Na2O'
  | 'Cl'
  | 'Si';

export interface DeclaredComposition {
  [key: string]: number | undefined;
}

export interface ElementalComposition {
  pct: Partial<Record<ElementKey, number>>;
  /** Warnings from conversion (e.g. total N without form split). */
  warnings: string[];
}

export interface FertilizerSpec {
  id: string;
  brand?: string;
  name: string;
  physicalForm: 'solid' | 'liquid';
  doseUnit: DoseUnit;
  /** Elemental mass % (w/w or w/v per label_basis). */
  elementalPct: Partial<Record<ElementKey, number>>;
  /** Raw label declaration before oxide conversion (optional). */
  declaredPct?: DeclaredComposition;
  /** Catalog provenance / import flags (e.g. n_total_includes_forms). */
  metadata?: Record<string, unknown>;
  maxDosePerL?: number;
  tank?: TankId;
}

export interface ToleranceOptions {
  /** Per-element max overdose above target (fraction, e.g. 0.2 = 20%). */
  overdosePct?: Partial<Record<ElementKey, number>>;
  /** Soft underdose corridor (fraction below target). Defaults to same as overdose. */
  underdosePct?: Partial<Record<ElementKey, number>>;
  /** Element weights in objective (higher = stricter). */
  weights?: Partial<Record<ElementKey, number>>;
}

/** Owner-approved forward solver objective (ADR-014). */
export interface SolverObjectiveConfig {
  elementPriorityWeight?: Record<string, number>;
  macroPriority?: number;
  microPriority?: number;
  macroOverdoseFactor?: number;
  macroUnderdoseFactor?: number;
  microOverdoseFactor?: number;
  microUnderdoseFactor?: number;
  /** Per-element reference ppm for unsolicited penalty (falls back to UNSOLICITED_REFERENCE_PPM). */
  unsolicitedReferencePpm?: Record<string, number>;
  unsolicitedElementWeight?: number;
  /**
   * An element without a target is free up to `fraction × reference ppm`; only the excess is
   * penalised (default `UNSOLICITED_FREE_FRACTION`). 0 penalises any amount.
   */
  unsolicitedFreeFraction?: number;
  /** Weight of the soft micro overdose ceiling (default `MICRO_SOFT_CAP_PENALTY`). */
  microSoftCapPenalty?: number;
}

export type ChemistryModel = 'hydroodo_legacy' | 'canonical';

export interface SolveForwardOptions {
  volumeL?: number;
  tolerances?: ToleranceOptions;
  /** Chemistry / factor set (default `canonical`). Golden parity uses `hydroodo_legacy`. */
  model?: ChemistryModel;
  /** Weighted relative-deviation objective parameters. */
  objective?: SolverObjectiveConfig;
  /**
   * Hydroodo-style overdose % by element group (N,P,K,…). Hard upper cap for macros;
   * for micros see `microOverdoseCap`.
   */
  overdosePctByGroup?: Record<string, number>;
  /**
   * `soft` (default): micro ceilings are an objective penalty plus `micro_over_cap` warning.
   * `hard`: every targeted group is a hard cap (Hydroodo parity).
   */
  microOverdoseCap?: import('./objective').MicroOverdoseCapMode;
  /** UI min-match setting (Hydroodo may return no variants; we still solve best-effort). */
  minMatchPct?: number;
  /** Max NH4 share of total elemental N in achieved solution (0–1). Hard constraint. */
  maxAmmoniumShare?: number;
  /** Optional hard EC ceiling (mS/cm); requires `ecEstimateMsCm`. */
  maxEcMsCm?: number;
  /** Optional EC estimator for constraint (default: built-in LMCv2 when `maxEcMsCm` set). */
  ecEstimateMsCm?: (achieved: Record<string, number>) => number;
  /** Pre-split fertilizers for concentrated A/B stock (Ca vs sulfate/phosphate). */
  tankMode?: 'single' | 'ab';
  /** Scale field doses to stock concentrate and check solubility. */
  stockTank?: import('./tanks-ab').StockTankOptions;
  /** Neutralize source-water bicarbonate before subtracting ions. */
  neutralizeAlkalinityWith?: 'HNO3' | 'H3PO4';
  residualHco3MmolPerL?: number;
  acidProduct?: import('./source-water').AcidProductStrength;
  /** Optional cost per L of product dose (tie-breaker). */
  productCostPerL?: Record<string, number>;
  /** Max number of alternative dose sets to return (including best). */
  maxAlternatives?: number;
  /** Rounding for doses in g/L or ml/L (default 0.001 step when 3). */
  doseDecimals?: number;
  /** Per-product dose floor (g/L or mL/L): the product is used at least at this dose. */
  minDosePerLById?: Record<string, number>;
  /**
   * Lock detected manufacturer A/B parts to a fixed ratio in the optimizer.
   * Default: on for `canonical`, off for `hydroodo_legacy` (golden parity).
   */
  linkManufacturerAbPairs?: boolean;
  /** Magic wand: require at least this dose (g/L or mL/L) on each linked part A column. */
  wandAbPairMinDoseGPerL?: number;
  /** Magic wand: fix linked part A dose (part B follows manufacturer ratio). */
  wandAbPairFixPartADoseGPerL?: number;
}

export interface Dose {
  fertilizerId: string;
  fertilizerName: string;
  amountPerL: number;
  unit: DoseUnit;
  tank: TankId;
  /** Total mass or volume for `volumeL` when set. */
  amountTotal?: number;
}

export interface Deviation {
  element: ElementKey;
  targetPpm: number;
  achievedPpm: number;
  deltaPpm: number;
  deltaPct: number;
  withinTolerance: boolean;
  overdoseLimitPpm: number;
  underdoseLimitPpm: number;
}

export interface SolveSolution {
  doses: Dose[];
  achievedPpm: TargetPpm | Record<string, number>;
  deviations: Deviation[];
  matchScore: number;
  weightedError: number;
  /** LMCv2-style EC estimate (mS/cm), when computable. */
  ecEstimateMsCm?: number;
  warnings: string[];
  stockTanks?: import('./tanks-ab').TankSplitResult;
}

export interface SolveForwardInput {
  /** Target ppm by element or Hydroodo group (N,P,K,…). */
  target: TargetPpm | Record<string, number>;
  water?: TargetPpm | Record<string, number>;
  /** Structured source water (ppm + alkalinity); merged with `water` when both set. */
  sourceWater?: import('./source-water').SourceWaterProfile;
  fertilizers: FertilizerSpec[];
  options?: SolveForwardOptions;
}

export interface SolveForwardResult {
  best: SolveSolution;
  alternatives: SolveSolution[];
  netTarget: TargetPpm;
  solverVersion: string;
  sourceWater?: {
    acid?: 'HNO3' | 'H3PO4';
    acidMlPerL?: number;
    acidMgPerL?: number;
    warnings: string[];
  };
}

export interface SolveReverseInput {
  doses: Array<{
    fertilizer: FertilizerSpec;
    amountPerL: number;
    /** When set (e.g. from nutrient_recipe_doses.unit), overrides product dose_unit for ppm math. */
    unit?: DoseUnit;
  }>;
  water?: TargetPpm;
  target?: TargetPpm;
  options?: Pick<
    SolveForwardOptions,
    'tolerances' | 'volumeL' | 'doseDecimals' | 'model' | 'overdosePctByGroup'
  >;
}

export interface SolveReverseResult {
  achievedPpm: TargetPpm;
  deviations?: Deviation[];
  matchScore?: number;
  ecEstimateMsCm?: number;
  warnings: string[];
  solverVersion: string;
}

export const SOLVER_VERSION = 'nutrient-calc@0.3.0-qp';

/** Elements used in default forward solve (stable row order). */
export const DEFAULT_SOLVE_ELEMENTS: ElementKey[] = [
  'N_NO3',
  'N_NH4',
  'N_UREA',
  'P',
  'K',
  'Ca',
  'Mg',
  'S',
  'Fe',
  'Mn',
  'Zn',
  'Cu',
  'B',
  'Mo',
];
