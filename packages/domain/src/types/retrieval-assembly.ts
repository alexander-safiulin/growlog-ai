/**
 * ADR-003: canonical retrieval assembly blocks (stable keys for prompts & tests).
 */

export const RETRIEVAL_INTENTS = [
  'status',
  'causal',
  'action',
  'planning',
  'report',
  'exploration',
  'full_cycle',
  'sop_execution_dialog',
  'daily_focus',
  'unknown',
] as const;

export type RetrievalIntentType = (typeof RETRIEVAL_INTENTS)[number];

export type TimeWindowIso = {
  from: string;
  to: string;
};

/** Откуда взято окно времени (ADR-003: intent vs явный запрос клиента). */
export type TimeWindowSource = 'intent' | 'requested';

/** Stage 1 — scope resolution */
export type ResolvedQueryScope = {
  farmId: string;
  cycleId: string | null;
  scopeId: string | null;
  timeWindow: TimeWindowIso;
  timeWindowSource: TimeWindowSource;
  needsClarification: boolean;
  clarificationHint: string | null;
};

/** Stage 2 — intent classification */
export type IntentClassification = {
  intentType: RetrievalIntentType;
  subIntents: RetrievalIntentType[];
  diagnosticRiskLevel: 'low' | 'medium' | 'high';
  requiresHistoricalContext: boolean;
  requiresKnowledgeContext: boolean;
  requiresSopContext: boolean;
  requiresPhotoContext: boolean;
  retrievalOnlyOutput: boolean;
};

export type CurrentStateBlock = {
  cycleStage: string | null;
  cycleName: string | null;
  cycleStatus: string | null;
  summary: string | null;
};

export type CyclePlantBriefItem = {
  id: string;
  plantCode: string;
  cultivarName: string | null;
  status: string;
};

export type CycleLightBrief = {
  lightHoursOn: number | null;
  lightHoursOff: number | null;
  lightsOnAt: string | null;
};

export type CycleFeedingBriefItem = {
  id: string;
  eventId: string;
  entryKind: 'watering' | 'feeding';
  occurredAt: string;
  volumeMl: number;
  ph: number | null;
  ecMs: number | null;
  recipeName: string | null;
  solutionSnapshotSummary: string | null;
};

/** Grower-facing journal lines (excludes high-volume sensor_snapshot spam). */
export type GrowerJournalEventItem = {
  id: string;
  occurredAt: string;
  eventType: string;
  title: string | null;
  body: string | null;
};

export type SensorLatestByMetricItem = {
  metricCode: string;
  metricName: string;
  valueNumeric: number;
  unit: string | null;
  capturedAt: string;
};

/** Always loaded when cycle_id is set (ADR-003 cycle brief for assistant). */
export type CycleBriefBlock = {
  cultivarSummary: string | null;
  plantCount: number;
  plants: CyclePlantBriefItem[];
  light: CycleLightBrief | null;
  recentFeedings: CycleFeedingBriefItem[];
  growerJournalEvents: GrowerJournalEventItem[];
  sensorDailyStats: EnvironmentalStatItem[];
  sensorLatestByMetric: SensorLatestByMetricItem[];
  /** Other rooms/tents of this cycle whose notes and sensors were not loaded. */
  unloadedScopes: { id: string; displayName: string }[];
};

export type ScoredLine<T> = T & { relevanceScore: number };

export type RecentEventItem = {
  id: string;
  occurredAt: string;
  eventType: string;
  title: string | null;
  body: string | null;
  scopeId: string | null;
  severity: string | null;
};

export type SensorContextItem = {
  id: string;
  capturedAt: string;
  metricCode: string;
  metricName: string;
  valueNumeric: number;
  unit: string | null;
  scopeId: string | null;
};

export type PhotoContextItem = {
  /** same as mediaAssetId — for scoring / stable keys */
  id: string;
  mediaAssetId: string;
  capturedAt: string | null;
  fileName: string | null;
  analysisSummary: string | null;
  tags: string[];
  /** ADR-010: saved_unanalyzed | processing_analysis | analysis_ready | analysis_failed */
  analysisStatus: string | null;
  analysisConfidence: number | null;
  /** ADR-015: ranked table hypotheses from leaf_diagnosis_v1, if present */
  leafHypothesisSummary: string | null;
};

/** ADR-010: derived temporal hypotheses between two frames (not causal proof). */
export type PhotoTimelineSignalItem = {
  id: string;
  fromMediaAssetId: string;
  toMediaAssetId: string;
  scopeId: string | null;
  signalType: string;
  signalStrength: number | null;
  description: string | null;
};

export type SopContextItem = {
  runId: string;
  definitionTitle: string;
  status: string;
  dueAt: string | null;
  reasonText: string | null;
  scopeId: string | null;
};

export type AnomalyContextItem = {
  id: string;
  occurredAt: string;
  eventType: string;
  title: string | null;
  body: string | null;
  severity: string | null;
};

export type CausalLinkItem = {
  id: string;
  fromEventId: string;
  toEventId: string;
  relationType: string;
};

export type HistoricalCycleItem = {
  id: string;
  name: string;
  stage: string;
  /** ISO date string (date column) */
  startDate: string;
  endDate: string | null;
  status: string;
};

export type HistoricalCycleSummaryItem = {
  cycleId: string;
  name: string;
  cultivarName: string | null;
  stage: string;
  status: string;
  startDate: string;
  endDate: string | null;
  anomalyCounts: Record<string, number>;
  feedingCount: number;
  harvestWetKg: number | null;
};

export type ApprovedLessonItem = {
  id: string;
  title: string | null;
  excerpt: string;
};

export type FarmProfileBlock = {
  farmId: string;
  name: string;
  city: string | null;
  country: string | null;
  timezone: string;
  scopes: { id: string; displayName: string; cycleId: string | null; active: boolean }[];
  activeCycles: { id: string; name: string; stage: string; status: string }[];
};

export type FeedingTrend7dBlock = {
  entryCount: number;
  totalVolumeMl: number;
  avgPh: number | null;
  avgEcMs: number | null;
  phMin: number | null;
  phMax: number | null;
  ecMin: number | null;
  ecMax: number | null;
};

export type ApprovedProcedureBrief = {
  id: string;
  sourceType: string;
  title: string;
  textExcerpt: string;
};

export type MemoryContextItem = {
  id: string;
  docType: string;
  title: string | null;
  excerpt: string;
};

export type KnowledgeContextItem = {
  id: string;
  docType: string;
  title: string | null;
  excerpt: string;
};

export type ObservationItem = {
  id: string;
  eventId: string;
  observationType: string;
  label: string | null;
  valueText: string | null;
};

export type ActionLogItem = {
  id: string;
  eventId: string;
  actionType: string;
  resultText: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type DailyTimelineItem = {
  id: string;
  timelineDate: string;
  summaryText: string | null;
  eventCount: number;
  anomalyCount: number;
};

export type ConversationMessageItem = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  messageText: string;
  createdAt: string;
};

export type EnvironmentalStatItem = {
  id: string;
  statDate: string;
  metricCode: string;
  metricName: string;
  minValue: number;
  maxValue: number;
  avgValue: number;
  readingCount: number;
  unit: string | null;
};

export type AiInsightRefItem = {
  id: string;
  insightType: string;
  title: string | null;
  bodyExcerpt: string;
  createdAt: string;
};

export type AssemblyGuardrails = {
  mustNotClaimWithoutEvidence: boolean;
  mustAskClarifyingQuestionIfScopeAmbiguous: boolean;
  blockStrongCausalOrActionWithoutSignals: boolean;
  blockFarmActionAdviceWithoutCycle: boolean;
};

/**
 * Full assembled context for LLM (ADR-003 § Assembly output format).
 */
/** Канонические входы ADR-003 + проводка для аудита и будущего dialog-aware retrieval. */
export type RetrievalSessionMeta = {
  userId: string;
  conversationId: string | null;
};

export type AnswerAssemblyContext = {
  assembledAtIso: string;
  farmTimezone: string;
  retrievalSession: RetrievalSessionMeta;
  request: {
    queryText: string;
    intentType: RetrievalIntentType;
    subIntents: RetrievalIntentType[];
    diagnosticRiskLevel: 'low' | 'medium' | 'high';
  };
  scope: ResolvedQueryScope;
  /** Подпись выбранного scope из БД (если передан scope_id). */
  scopeUi: { id: string; displayName: string } | null;
  intentMeta: IntentClassification;
  currentState: CurrentStateBlock;
  /** Populated when cycle_id is set; independent of query intent keywords. */
  cycleBrief: CycleBriefBlock | null;
  recentEvents: ScoredLine<RecentEventItem>[];
  sensorContext: ScoredLine<SensorContextItem>[];
  photoContext: ScoredLine<PhotoContextItem>[];
  /** ADR-010: pairwise visual dynamics (scope/time filtered in fetch). */
  photoTimelineSignals: PhotoTimelineSignalItem[];
  sopContext: ScoredLine<SopContextItem>[];
  anomalyContext: ScoredLine<AnomalyContextItem>[];
  /** event_links (causal layer; ADR causal_links not in DB — use event_links) */
  causalContext: CausalLinkItem[];
  historicalContext: {
    pastCycles: HistoricalCycleItem[];
    patternInsights: AiInsightRefItem[];
    pastCycleSummaries?: HistoricalCycleSummaryItem[];
    approvedLessons?: ApprovedLessonItem[];
  };
  farmProfile?: FarmProfileBlock | null;
  feedingTrend7d?: FeedingTrend7dBlock | null;
  approvedProcedures?: ApprovedProcedureBrief[];
  memoryContext: ScoredLine<MemoryContextItem>[];
  knowledgeContext: ScoredLine<KnowledgeContextItem>[];
  /** Intent-specific extras */
  observations: ScoredLine<ObservationItem>[];
  recentActions: ScoredLine<ActionLogItem>[];
  dailyTimelines: DailyTimelineItem[];
  /** Prior turns in the same advisor conversation (if conversationId set). */
  conversationHistory: ConversationMessageItem[];
  /** Daily min/max/avg sensor aggregates for the retrieval window. */
  environmentalStats: EnvironmentalStatItem[];
  missingData: string[];
  guardrails: AssemblyGuardrails;
};
