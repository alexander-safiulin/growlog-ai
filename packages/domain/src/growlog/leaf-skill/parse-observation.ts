import type {
  CanopyPosition,
  ColorPattern,
  EdgeSymptom,
  LeafAge,
  LeafObservationCard,
  LeafSkillResult,
  Spotting,
  VeinStatus,
} from './types';

const LEAF_AGES = new Set<LeafAge>(['older', 'newer', 'mixed', 'unknown']);
const CANOPY = new Set<CanopyPosition>(['lower', 'middle', 'upper', 'whole_plant', 'unknown']);
const COLORS = new Set<ColorPattern>([
  'uniform_yellow',
  'interveinal_chlorosis',
  'edge_necrosis',
  'tip_necrosis',
  'dark_green',
  'purple_red_stems',
  'bleached_spots',
  'general_pale',
  'unknown',
]);
const VEINS = new Set<VeinStatus>(['veins_green', 'veins_yellow', 'no_contrast', 'unknown']);
const EDGES = new Set<EdgeSymptom>(['burn', 'curl_down', 'curl_up', 'none', 'unknown']);
const SPOTS = new Set<Spotting>(['none', 'brown_spots', 'white_powder', 'other', 'unknown']);

function pick<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

/** Normalize vision JSON into closed observation card (ADR-015). */
export function parseLeafObservationCard(raw: unknown): LeafObservationCard {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const confidenceRaw = o.confidence;
  let confidence: LeafObservationCard['confidence'];
  if (confidenceRaw && typeof confidenceRaw === 'object' && !Array.isArray(confidenceRaw)) {
    const c = confidenceRaw as Record<string, unknown>;
    confidence = {};
    for (const key of [
      'leaf_age',
      'canopy_position',
      'color_pattern',
      'vein_status',
      'edge_symptom',
      'spotting',
    ] as const) {
      const n = c[key];
      if (typeof n === 'number' && Number.isFinite(n)) {
        confidence[key] = Math.min(1, Math.max(0, n));
      }
    }
  }
  return {
    leaf_age: pick(o.leaf_age, LEAF_AGES, 'unknown'),
    canopy_position: pick(o.canopy_position, CANOPY, 'unknown'),
    color_pattern: pick(o.color_pattern, COLORS, 'unknown'),
    vein_status: pick(o.vein_status, VEINS, 'unknown'),
    edge_symptom: pick(o.edge_symptom, EDGES, 'unknown'),
    spotting: pick(o.spotting, SPOTS, 'unknown'),
    ...(confidence && Object.keys(confidence).length ? { confidence } : {}),
  };
}

export const LEAF_SKILL_SIGNAL_KEY = 'leaf_diagnosis_v1';

export type StoredLeafSkillPayload = {
  observation: LeafObservationCard;
  result: LeafSkillResult;
};

export function extractStoredLeafSkill(signals: unknown): StoredLeafSkillPayload | null {
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) return null;
  const block = (signals as Record<string, unknown>)[LEAF_SKILL_SIGNAL_KEY];
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
  const b = block as Record<string, unknown>;
  if (!b.result || typeof b.result !== 'object') return null;
  const observation = parseLeafObservationCard(b.observation ?? {});
  const result = b.result as StoredLeafSkillPayload['result'];
  if (result.version !== 'leaf_diagnosis_v1') return null;
  return { observation, result };
}

export function leafHypothesesToIssues(
  result: StoredLeafSkillPayload['result'],
): Array<{ code: string; note: string }> {
  return result.hypotheses.map((h) => ({
    code: h.code,
    note: `${h.label} (score ${h.score})`,
  }));
}
