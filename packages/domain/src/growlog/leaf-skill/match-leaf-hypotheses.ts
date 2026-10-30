import { LEAF_HYPOTHESIS_RULES } from './hypothesis-table';
import type {
  LeafHypothesisRank,
  LeafJournalContext,
  LeafObservationCard,
  LeafSkillResult,
} from './types';
import { LEAF_SKILL_VERSION } from './types';

const MIN_SCORE = 0.35;
const MAX_HYPOTHESES = 3;

function groundedFacts(journal: LeafJournalContext): string[] {
  const facts: string[] = [];
  if (journal.substratePh != null && Number.isFinite(journal.substratePh)) {
    facts.push(`pH субстрата/стока: ${journal.substratePh}`);
  }
  if (journal.substrateEc != null && Number.isFinite(journal.substrateEc)) {
    facts.push(`EC субстрата/стока: ${journal.substrateEc}`);
  }
  if (journal.solutionPh != null && Number.isFinite(journal.solutionPh)) {
    facts.push(`pH раствора: ${journal.solutionPh}`);
  }
  if (journal.solutionEc != null && Number.isFinite(journal.solutionEc)) {
    facts.push(`EC раствора: ${journal.solutionEc}`);
  }
  if (journal.lastFeedingAt) {
    const label = journal.lastFeedingLabel?.trim();
    facts.push(label ? `Последняя подкормка: ${label} (${journal.lastFeedingAt})` : `Последняя подкормка: ${journal.lastFeedingAt}`);
  }
  return facts;
}

function missingData(journal: LeafJournalContext, obs: LeafObservationCard): string[] {
  const missing: string[] = [];
  if (journal.substratePh == null && journal.solutionPh == null) {
    missing.push('pH (субстрат, сток или раствор)');
  }
  if (journal.substrateEc == null && journal.solutionEc == null) {
    missing.push('EC (субстрат, сток или раствор)');
  }
  if (!journal.lastFeedingAt) {
    missing.push('Дата и состав последней подкормки');
  }
  if (obs.canopy_position === 'unknown' || obs.leaf_age === 'unknown') {
    missing.push('Кадр куста: верх или низ, старый или молодой лист');
  }
  return missing;
}

function adjustForJournal(
  code: LeafHypothesisRank['code'],
  score: number,
  journal: LeafJournalContext,
): number {
  const ph = journal.substratePh ?? journal.solutionPh;
  if (code === 'ph_lockout' && ph != null) {
    if (ph < 5.5 || ph > 6.5) return Math.min(1, score + 0.25);
    return Math.max(0, score - 0.15);
  }
  if (code === 'iron' || code === 'manganese' || code === 'zinc') {
    if (ph != null && ph > 6.8) return Math.min(1, score + 0.15);
  }
  return score;
}

function pickNextStep(
  missing: string[],
  obs: LeafObservationCard,
): LeafSkillResult['next_step'] {
  if (missing.some((m) => m.includes('Кадр куста'))) {
    return {
      kind: 'ask_photo',
      prompt: 'Снимите второй кадр: весь куст или ветка, чтобы было видно, верх это или низ.',
    };
  }
  if (missing.some((m) => m.startsWith('pH'))) {
    return {
      kind: 'ask_measurement',
      prompt: 'Измерьте pH стока или субстрата и запишите в журнал — без этого гипотезы остаются слабыми.',
    };
  }
  if (missing.some((m) => m.startsWith('EC'))) {
    return {
      kind: 'ask_measurement',
      prompt: 'Измерьте EC стока или раствора и зафиксируйте значение.',
    };
  }
  if (missing.some((m) => m.includes('подкормк'))) {
    return {
      kind: 'review_journal',
      prompt: 'Отметьте в журнале последнюю подкормку (что и когда вносили).',
    };
  }
  if (obs.color_pattern === 'unknown') {
    return {
      kind: 'ask_photo',
      prompt: 'Снимите лист крупнее, при мягком свете, без вспышки.',
    };
  }
  return { kind: 'none', prompt: 'Сверьте гипотезы с pH/EC и динамикой за несколько дней.' };
}

/**
 * Pure matcher: observation card + optional journal facts → ranked hypotheses (ADR-015).
 */
export function matchLeafHypotheses(
  observation: LeafObservationCard,
  journal: LeafJournalContext = {},
): LeafSkillResult {
  const ranked: LeafHypothesisRank[] = LEAF_HYPOTHESIS_RULES.map((rule) => {
    const raw = rule.match(observation) * rule.weight;
    const score = adjustForJournal(rule.code, raw, journal);
    return {
      code: rule.code,
      label: rule.label,
      score: Math.round(score * 1000) / 1000,
      rationale: `Сопоставление с таблицей ${LEAF_SKILL_VERSION} (${rule.code}).`,
    };
  })
    .filter((h) => h.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HYPOTHESES);

  const miss = missingData(journal, observation);
  const facts = groundedFacts(journal);

  return {
    version: LEAF_SKILL_VERSION,
    observation,
    hypotheses: ranked,
    missing_data: miss,
    grounded_facts: facts,
    next_step: pickNextStep(miss, observation),
  };
}

/** Default empty card when vision fill-in fails. */
export function emptyLeafObservationCard(): LeafObservationCard {
  return {
    leaf_age: 'unknown',
    canopy_position: 'unknown',
    color_pattern: 'unknown',
    vein_status: 'unknown',
    edge_symptom: 'unknown',
    spotting: 'unknown',
  };
}
