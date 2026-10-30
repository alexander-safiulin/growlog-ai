/** Bump when observation schema or hypothesis table changes (ADR-015). */
export const LEAF_SKILL_VERSION = 'leaf_diagnosis_v1';

export type LeafAge = 'older' | 'newer' | 'mixed' | 'unknown';
export type CanopyPosition = 'lower' | 'middle' | 'upper' | 'whole_plant' | 'unknown';

export type ColorPattern =
  | 'uniform_yellow'
  | 'interveinal_chlorosis'
  | 'edge_necrosis'
  | 'tip_necrosis'
  | 'dark_green'
  | 'purple_red_stems'
  | 'bleached_spots'
  | 'general_pale'
  | 'unknown';

export type VeinStatus = 'veins_green' | 'veins_yellow' | 'no_contrast' | 'unknown';
export type EdgeSymptom = 'burn' | 'curl_down' | 'curl_up' | 'none' | 'unknown';
export type Spotting = 'none' | 'brown_spots' | 'white_powder' | 'other' | 'unknown';

/** Closed observation card — LLM may only set these keys (ADR-015). */
export type LeafObservationCard = {
  leaf_age: LeafAge;
  canopy_position: CanopyPosition;
  color_pattern: ColorPattern;
  vein_status: VeinStatus;
  edge_symptom: EdgeSymptom;
  spotting: Spotting;
  /** 0..1 per-field confidence from vision fill-in; omit if unknown. */
  confidence?: Partial<
    Record<
      'leaf_age' | 'canopy_position' | 'color_pattern' | 'vein_status' | 'edge_symptom' | 'spotting',
      number
    >
  >;
};

export type LeafJournalContext = {
  /** Latest substrate/runoff pH if known from journal/sensors. */
  substratePh?: number | null;
  substrateEc?: number | null;
  /** Reservoir / nutrient solution. */
  solutionPh?: number | null;
  solutionEc?: number | null;
  /** ISO timestamp of last feeding/watering with nutrients. */
  lastFeedingAt?: string | null;
  lastFeedingLabel?: string | null;
};

export type LeafHypothesisCode =
  | 'nitrogen'
  | 'phosphorus'
  | 'potassium'
  | 'magnesium'
  | 'sulfur'
  | 'iron'
  | 'manganese'
  | 'zinc'
  | 'calcium'
  | 'boron'
  | 'light_burn'
  | 'ph_lockout'
  | 'natural_senescence'
  | 'overwatering_stress';

export type LeafHypothesisRank = {
  code: LeafHypothesisCode;
  label: string;
  score: number;
  rationale: string;
};

export type LeafNextStepKind = 'ask_measurement' | 'ask_photo' | 'review_journal' | 'none';

export type LeafSkillResult = {
  version: typeof LEAF_SKILL_VERSION;
  observation: LeafObservationCard;
  hypotheses: LeafHypothesisRank[];
  missing_data: string[];
  grounded_facts: string[];
  next_step: {
    kind: LeafNextStepKind;
    prompt: string;
  };
};
