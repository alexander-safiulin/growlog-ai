import type { LeafHypothesisCode, LeafObservationCard } from './types';

export type HypothesisRule = {
  code: LeafHypothesisCode;
  label: string;
  /** Higher weight = stronger match when conditions hit. */
  weight: number;
  match: (obs: LeafObservationCard) => number;
};

function ageOlder(obs: LeafObservationCard): number {
  if (obs.leaf_age === 'older') return 1;
  if (obs.canopy_position === 'lower') return 0.6;
  return 0;
}

function ageNewer(obs: LeafObservationCard): number {
  if (obs.leaf_age === 'newer') return 1;
  if (obs.canopy_position === 'upper') return 0.5;
  return 0;
}

function interveinal(obs: LeafObservationCard): number {
  if (obs.color_pattern === 'interveinal_chlorosis') return 1;
  if (obs.vein_status === 'veins_green') return 0.7;
  return 0;
}

/** Deterministic hypothesis table (ADR-015). Scores are relative, not agronomic certainty. */
export const LEAF_HYPOTHESIS_RULES: HypothesisRule[] = [
  {
    code: 'nitrogen',
    label: 'Возможный дефицит азота (N)',
    weight: 1,
    match: (obs) => {
      const mobile = ageOlder(obs);
      const yellow =
        obs.color_pattern === 'uniform_yellow' || obs.color_pattern === 'general_pale' ? 1 : 0;
      const lower = obs.canopy_position === 'lower' ? 0.4 : 0;
      return Math.min(1, mobile * 0.7 + yellow * 0.8 + lower * 0.3);
    },
  },
  {
    code: 'magnesium',
    label: 'Возможный дефицит магния (Mg)',
    weight: 1.1,
    match: (obs) => {
      const mobile = ageOlder(obs);
      const iv = interveinal(obs);
      return Math.min(1, mobile * 0.5 + iv * 0.9);
    },
  },
  {
    code: 'potassium',
    label: 'Возможный дефицит калия (K)',
    weight: 1,
    match: (obs) => {
      const mobile = ageOlder(obs);
      const edge =
        obs.color_pattern === 'edge_necrosis' ||
        obs.edge_symptom === 'burn' ||
        obs.edge_symptom === 'curl_up'
          ? 1
          : 0;
      return Math.min(1, mobile * 0.5 + edge * 0.85);
    },
  },
  {
    code: 'phosphorus',
    label: 'Возможный дефицит фосфора (P)',
    weight: 0.9,
    match: (obs) => {
      const mobile = ageOlder(obs);
      const purple = obs.color_pattern === 'purple_red_stems' ? 1 : 0;
      const dark = obs.color_pattern === 'dark_green' ? 0.5 : 0;
      return Math.min(1, mobile * 0.4 + purple * 0.9 + dark * 0.3);
    },
  },
  {
    code: 'sulfur',
    label: 'Возможный дефицит серы (S)',
    weight: 0.85,
    match: (obs) => {
      const mobile = ageOlder(obs);
      const pale = obs.color_pattern === 'general_pale' || obs.color_pattern === 'uniform_yellow';
      const upper = obs.canopy_position === 'upper' ? 0.3 : 0;
      return Math.min(1, mobile * 0.4 + (pale ? 0.6 : 0) + upper);
    },
  },
  {
    code: 'iron',
    label: 'Возможный дефицит железа (Fe)',
    weight: 1.15,
    match: (obs) => {
      const young = ageNewer(obs);
      const iv = interveinal(obs);
      return Math.min(1, young * 0.6 + iv * 0.95);
    },
  },
  {
    code: 'manganese',
    label: 'Возможный дефицит марганца (Mn)',
    weight: 1,
    match: (obs) => {
      const young = ageNewer(obs);
      const iv = interveinal(obs);
      const spots = obs.spotting === 'brown_spots' ? 0.4 : 0;
      return Math.min(1, young * 0.5 + iv * 0.7 + spots);
    },
  },
  {
    code: 'zinc',
    label: 'Возможный дефицит цинка (Zn)',
    weight: 0.95,
    match: (obs) => {
      const young = ageNewer(obs);
      const inter =
        obs.color_pattern === 'interveinal_chlorosis' || obs.color_pattern === 'general_pale';
      const smallLeaves = obs.leaf_age === 'newer' ? 0.5 : 0;
      return Math.min(1, young * 0.55 + (inter ? 0.5 : 0) + smallLeaves);
    },
  },
  {
    code: 'calcium',
    label: 'Возможный дефицит кальция (Ca)',
    weight: 1.05,
    match: (obs) => {
      const young = ageNewer(obs);
      const tip = obs.color_pattern === 'tip_necrosis' || obs.edge_symptom === 'burn' ? 0.9 : 0;
      const spots = obs.spotting === 'brown_spots' ? 0.5 : 0;
      return Math.min(1, young * 0.45 + tip + spots * 0.4);
    },
  },
  {
    code: 'boron',
    label: 'Возможный дефицит бора (B)',
    weight: 0.8,
    match: (obs) => {
      const young = ageNewer(obs);
      const tip = obs.color_pattern === 'tip_necrosis' ? 0.7 : 0;
      const curl = obs.edge_symptom === 'curl_down' ? 0.5 : 0;
      return Math.min(1, young * 0.4 + tip + curl);
    },
  },
  {
    code: 'light_burn',
    label: 'Похоже на световой ожог (не дефицит)',
    weight: 1.1,
    match: (obs) => {
      const upper = obs.canopy_position === 'upper' ? 0.7 : 0;
      const bleach = obs.color_pattern === 'bleached_spots' ? 1 : 0;
      const edge = obs.edge_symptom === 'burn' && obs.canopy_position === 'upper' ? 0.6 : 0;
      return Math.min(1, upper + bleach * 0.8 + edge);
    },
  },
  {
    code: 'ph_lockout',
    label: 'Возможная блокировка питания (pH / EC)',
    weight: 1,
    match: (obs) => {
      const iv = interveinal(obs);
      const mixed = obs.leaf_age === 'mixed' ? 0.4 : 0;
      return Math.min(1, iv * 0.5 + mixed + (obs.color_pattern === 'interveinal_chlorosis' ? 0.3 : 0));
    },
  },
  {
    code: 'natural_senescence',
    label: 'Естественное старение нижних листьев',
    weight: 1,
    match: (obs) => {
      const lower = obs.canopy_position === 'lower' && obs.leaf_age === 'older' ? 1 : 0;
      const yellow = obs.color_pattern === 'uniform_yellow' ? 0.6 : 0;
      const noneEdge = obs.edge_symptom === 'none' ? 0.2 : 0;
      return Math.min(1, lower * 0.9 + yellow * 0.4 + noneEdge);
    },
  },
  {
    code: 'overwatering_stress',
    label: 'Стресс от переувлажнения / корней',
    weight: 0.85,
    match: (obs) => {
      const curl = obs.edge_symptom === 'curl_down' ? 0.8 : 0;
      const pale = obs.color_pattern === 'general_pale' ? 0.5 : 0;
      const lower = obs.canopy_position === 'lower' ? 0.3 : 0;
      return Math.min(1, curl + pale * 0.4 + lower);
    },
  },
];
