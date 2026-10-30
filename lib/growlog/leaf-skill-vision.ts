import {
  formatLeafSkillBody,
  leafHypothesesToIssues,
  LEAF_SKILL_SIGNAL_KEY,
  matchLeafHypotheses,
  parseLeafObservationCard,
  type LeafSkillResult,
  type StoredLeafSkillPayload,
} from '@growlog/domain';
import type { LeafJournalContext } from '@growlog/domain';

export const LEAF_VISION_SYSTEM = `You are a greenhouse leaf observation assistant. Output MUST be valid JSON only, no markdown.
Rules:
- Fill ONLY the observation object using allowed enum values; use "unknown" when not visible.
- summary_text: short Russian observation-style text (what you see), not a diagnosis.
- tags: 3–10 short tokens.
- Never name a nutrient deficiency as confirmed fact.
Allowed observation.leaf_age: older | newer | mixed | unknown
Allowed observation.canopy_position: lower | middle | upper | whole_plant | unknown
Allowed observation.color_pattern: uniform_yellow | interveinal_chlorosis | edge_necrosis | tip_necrosis | dark_green | purple_red_stems | bleached_spots | general_pale | unknown
Allowed observation.vein_status: veins_green | veins_yellow | no_contrast | unknown
Allowed observation.edge_symptom: burn | curl_down | curl_up | none | unknown
Allowed observation.spotting: none | brown_spots | white_powder | other | unknown
Optional observation.confidence: per-field numbers 0..1
Also return confidence: 0..1 overall.`;

export type LeafVisionModelJson = {
  summary_text?: string;
  tags?: string[];
  observation?: unknown;
  confidence?: number;
};

export function applyLeafSkillToAnalysis(params: {
  parsed: LeafVisionModelJson;
  journal: LeafJournalContext;
}): {
  summaryText: string | null;
  tags: string[];
  signals: Record<string, unknown>;
  issues_detected: Array<{ code: string; note: string }>;
  confidence: number | null;
  leafResult: LeafSkillResult;
} {
  const observation = parseLeafObservationCard(params.parsed.observation ?? {});
  const leafResult = matchLeafHypotheses(observation, params.journal);
  const skillBlock: StoredLeafSkillPayload = { observation, result: leafResult };

  const summaryFromModel =
    typeof params.parsed.summary_text === 'string' ? params.parsed.summary_text.trim() : '';
  const summaryText = summaryFromModel || formatLeafSkillBody(leafResult).slice(0, 4000);

  const tags = Array.isArray(params.parsed.tags)
    ? params.parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 24)
    : [];

  const modelConf =
    typeof params.parsed.confidence === 'number' && Number.isFinite(params.parsed.confidence)
      ? Math.min(1, Math.max(0, params.parsed.confidence))
      : null;
  const topHyp = leafResult.hypotheses[0]?.score ?? 0;
  const confidence = modelConf != null ? modelConf : topHyp > 0 ? Math.min(1, topHyp) : null;

  return {
    summaryText,
    tags,
    signals: { [LEAF_SKILL_SIGNAL_KEY]: skillBlock },
    issues_detected: leafHypothesesToIssues(leafResult),
    confidence,
    leafResult,
  };
}
