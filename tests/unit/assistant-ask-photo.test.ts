import { describe, expect, it } from 'vitest';

import { shouldSkipLlmForAdvice } from '@/lib/assistant/deterministic-insight';
import type { AnswerAssemblyContext } from '@/types/retrieval-assembly';

function emptyPack(): AnswerAssemblyContext {
  return {
    scope: { needsClarification: false, clarificationHint: null, farmId: 'f1', cycleId: null, scopeId: null },
    recentEvents: [],
    anomalyContext: [],
    sensorContext: [],
    sopContext: [],
    photoContext: [],
    observations: [],
    recentActions: [],
    knowledgeContext: [],
    memoryContext: [],
    dailyTimelines: [],
    causalContext: [],
    photoTimelineSignals: [],
    historicalContext: { pastCycles: [], patternInsights: [] },
    conversationHistory: [],
    missingData: [],
  } as AnswerAssemblyContext;
}

describe('shouldSkipLlmForAdvice', () => {
  it('does not skip LLM when a photo is attached even if retrieval is empty', () => {
    expect(
      shouldSkipLlmForAdvice(emptyPack(), { escalate: false, hasAttachedPhoto: true })
    ).toBe(false);
  });

  it('skips LLM on empty retrieval without photo', () => {
    expect(
      shouldSkipLlmForAdvice(emptyPack(), { escalate: false, hasAttachedPhoto: false })
    ).toBe(true);
  });

  it('does not skip LLM on scope clarification when a photo is attached', () => {
    const pack = emptyPack();
    pack.scope = { ...pack.scope, needsClarification: true, clarificationHint: 'Pick a zone' };
    expect(
      shouldSkipLlmForAdvice(pack, { escalate: false, hasAttachedPhoto: true })
    ).toBe(false);
  });
});
