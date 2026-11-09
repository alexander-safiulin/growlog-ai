import type { AnswerAssemblyContext } from '@/types/retrieval-assembly';

export type ContextManifestLayer = {
  layer: string;
  count: number;
};

export type ContextManifest = {
  layers: ContextManifestLayer[];
  missingData: string[];
  intentType: string;
  assembledAtIso: string;
};

export function buildContextManifest(pack: AnswerAssemblyContext): ContextManifest {
  const brief = pack.cycleBrief;
  const layers: ContextManifestLayer[] = [
    { layer: 'farm_profile', count: pack.farmProfile ? 1 : 0 },
    { layer: 'cycle_brief', count: brief ? 1 : 0 },
    { layer: 'recent_events', count: pack.recentEvents.length },
    { layer: 'sensor_context', count: pack.sensorContext.length },
    { layer: 'sensor_daily_stats', count: (brief?.sensorDailyStats.length ?? 0) + pack.environmentalStats.length },
    { layer: 'feeding_recent', count: brief?.recentFeedings.length ?? 0 },
    { layer: 'feeding_trend_7d', count: pack.feedingTrend7d ? 1 : 0 },
    { layer: 'sop_runs', count: pack.sopContext.length },
    { layer: 'approved_procedures', count: pack.approvedProcedures?.length ?? 0 },
    { layer: 'anomalies', count: pack.anomalyContext.length },
    { layer: 'photos', count: pack.photoContext.length },
    { layer: 'historical_cycles', count: pack.historicalContext.pastCycles.length },
    { layer: 'historical_summaries', count: pack.historicalContext.pastCycleSummaries?.length ?? 0 },
    { layer: 'approved_lessons', count: pack.historicalContext.approvedLessons?.length ?? 0 },
    { layer: 'knowledge', count: pack.knowledgeContext.length },
    { layer: 'memory', count: pack.memoryContext.length },
    { layer: 'daily_timelines', count: pack.dailyTimelines.length },
    { layer: 'conversation_history', count: pack.conversationHistory.length },
  ].filter((row) => row.count > 0);

  return {
    layers,
    missingData: pack.missingData,
    intentType: pack.request.intentType,
    assembledAtIso: pack.assembledAtIso,
  };
}

const PROMPT_CHAR_BUDGET = 28_000;

/** Truncate formatted prompt with priority: keep scope, current_state, missing_data, guardrails. */
export function applyPromptCharBudget(formatted: string): string {
  if (formatted.length <= PROMPT_CHAR_BUDGET) return formatted;
  const markers = ['--- missing_data ---', '--- guardrails ---'];
  const tailStart = markers
    .map((m) => formatted.indexOf(m))
    .filter((i) => i >= 0)
  const tailFrom = tailStart.length ? Math.min(...tailStart) : formatted.length;
  const head = formatted.slice(0, tailFrom);
  const tail = formatted.slice(tailFrom);
  const headBudget = PROMPT_CHAR_BUDGET - tail.length - 80;
  if (headBudget < 2000) return formatted.slice(0, PROMPT_CHAR_BUDGET);
  return `${head.slice(0, headBudget)}\n\n--- prompt_truncated ---\n(контекст усечён по бюджету ${PROMPT_CHAR_BUDGET} символов)\n${tail}`;
}
