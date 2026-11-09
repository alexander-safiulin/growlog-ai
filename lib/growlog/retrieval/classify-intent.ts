import type { IntentClassification, RetrievalIntentType } from '@/types/retrieval-assembly';

/** JS `\b` is ASCII-only; use Unicode letter/number boundaries for Cyrillic intents. */
function uWordPattern(alternation: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`, 'iu');
}

const CAUSAL = uWordPattern(
  'почему|зачем|из-за|причин\\p{L}*|caus|why|because|trigger|вызвал|вызвало'
);
const ACTION = uWordPattern(
  'что делать|как\\s+(сейчас|лучше)|следующ(ий|его)|рекоменд\\p{L}*|полей|подкорм|пролей|обреж|пересад|what\\s+to\\s+do|should\\s+i'
);
const STATUS = uWordPattern(
  'сейчас|текущ\\p{L}*|состояни\\p{L}*|как\\s+дела|how\\s+is|status|стадия\\s+сейчас'
);
const PLANNING = uWordPattern(
  'если\\s+я|что\\s+будет|план|когда\\s+лучше|прогноз|timeline|schedule'
);
const REPORT = uWordPattern(
  'отчёт|отчет|recap|summary\\s+за|сводк\\p{L}*|за\\s+недел|за\\s+месяц|grow\\s+report'
);
const EXPLORATION = uWordPattern(
  'покажи|найди|перечисл\\p{L}*|список|сравни|поиск|where\\s+is|list|show\\s+me|find'
);
const SOP = uWordPattern('sop|регламент|протокол|чеклист|процедур');
const DAILY = uWordPattern('сегодня|на\\s+сегодня|daily\\s+focus|фокус\\s+дня|просроч');
const FULL_CYCLE = uWordPattern(
  'весь\\s+цикл|за\\s+весь\\s+период|full\\s+cycle|whole\\s+cycle|с\\s+начала|since\\s+start'
);

const DIAG_HIGH = uWordPattern(
  'болезн\\p{L}*|вредител\\p{L}*|плесен\\p{L}*|гриб\\p{L}*|дефицит\\p{L}*|токсич\\p{L}*|загн\\p{L}*|pests?|mold|deficienc|disease|вирус'
);

/**
 * ADR-003 Stage 2 — deterministic MVP classifier (no LLM). Ties into SQL retrieval flags.
 */
export function classifyQueryIntent(queryText: string): IntentClassification {
  const q = queryText.trim();
  if (!q) {
    return {
      intentType: 'unknown',
      subIntents: [],
      diagnosticRiskLevel: 'low',
      requiresHistoricalContext: false,
      requiresKnowledgeContext: false,
      requiresSopContext: false,
      requiresPhotoContext: false,
      retrievalOnlyOutput: false,
    };
  }

  const scores: { intent: RetrievalIntentType; hit: boolean }[] = [
    { intent: 'daily_focus', hit: DAILY.test(q) },
    { intent: 'full_cycle', hit: FULL_CYCLE.test(q) },
    { intent: 'sop_execution_dialog', hit: SOP.test(q) },
    { intent: 'report', hit: REPORT.test(q) },
    { intent: 'exploration', hit: EXPLORATION.test(q) },
    { intent: 'planning', hit: PLANNING.test(q) },
    { intent: 'causal', hit: CAUSAL.test(q) },
    { intent: 'action', hit: ACTION.test(q) },
    { intent: 'status', hit: STATUS.test(q) },
  ];

  const hits = scores.filter((s) => s.hit).map((s) => s.intent);
  const primary: RetrievalIntentType = hits.length > 0 ? hits[0] : 'status';
  const subIntents = [...new Set(hits.slice(1))] as RetrievalIntentType[];

  const diagnosticRiskLevel: 'low' | 'medium' | 'high' = DIAG_HIGH.test(q)
    ? 'high'
    : primary === 'causal' || primary === 'action'
      ? 'medium'
      : 'low';

  const requiresHistoricalContext =
    primary === 'causal' ||
    primary === 'planning' ||
    primary === 'full_cycle' ||
    primary === 'report' ||
    subIntents.includes('planning') ||
    subIntents.includes('full_cycle');

  const requiresKnowledgeContext =
    primary === 'action' ||
    primary === 'planning' ||
    primary === 'causal' ||
    diagnosticRiskLevel === 'high';

  const requiresSopContext =
    primary === 'action' ||
    primary === 'daily_focus' ||
    primary === 'sop_execution_dialog' ||
    subIntents.includes('action');

  const requiresPhotoContext =
    primary === 'causal' ||
    primary === 'status' ||
    diagnosticRiskLevel === 'high';

  return {
    intentType: primary,
    subIntents,
    diagnosticRiskLevel,
    requiresHistoricalContext,
    requiresKnowledgeContext,
    requiresSopContext,
    requiresPhotoContext,
    retrievalOnlyOutput: false,
  };
}
