import { describe, expect, it } from 'vitest';
import {
  applyPromptCharBudget,
  buildContextManifest,
} from '@/lib/growlog/retrieval/context-manifest';
import type { AnswerAssemblyContext } from '@/types/retrieval-assembly';

function minimalPack(overrides: Partial<AnswerAssemblyContext> = {}): AnswerAssemblyContext {
  return {
    assembledAtIso: new Date().toISOString(),
    farmTimezone: 'UTC',
    retrievalSession: { userId: 'u', conversationId: null },
    request: {
      queryText: 'test',
      intentType: 'status',
      subIntents: [],
      diagnosticRiskLevel: 'low',
    },
    scope: {
      farmId: 'farm',
      cycleId: 'cycle',
      scopeId: 'scope',
      timeWindow: { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' },
      timeWindowSource: 'intent_default',
      needsClarification: false,
      clarificationHint: null,
    },
    scopeUi: null,
    intentMeta: {
      intentType: 'status',
      subIntents: [],
      diagnosticRiskLevel: 'low',
      requiresHistoricalContext: false,
      requiresKnowledgeContext: false,
      requiresSopContext: false,
      requiresPhotoContext: false,
      retrievalOnlyOutput: false,
    },
    currentState: { cycleStage: null, cycleName: null, cycleStatus: null, summary: null },
    cycleBrief: null,
    farmProfile: { farmId: 'farm', name: 'F', city: null, country: null, timezone: 'UTC', scopes: [], activeCycles: [] },
    feedingTrend7d: null,
    approvedProcedures: [],
    recentEvents: [{ id: 'e1', relevanceScore: 1 } as AnswerAssemblyContext['recentEvents'][0]],
    sensorContext: [],
    photoContext: [],
    photoTimelineSignals: [],
    sopContext: [],
    anomalyContext: [],
    causalContext: [],
    historicalContext: { pastCycles: [], patternInsights: [], pastCycleSummaries: [], approvedLessons: [] },
    memoryContext: [],
    knowledgeContext: [],
    observations: [],
    recentActions: [],
    dailyTimelines: [],
    conversationHistory: [],
    environmentalStats: [],
    missingData: ['no_sensors'],
    guardrails: {
      mustNotClaimWithoutEvidence: true,
      mustAskClarifyingQuestionIfScopeAmbiguous: false,
      blockStrongCausalOrActionWithoutSignals: false,
      blockFarmActionAdviceWithoutCycle: false,
    },
    ...overrides,
  };
}

describe('buildContextManifest', () => {
  it('counts non-empty layers and copies missing data', () => {
    const manifest = buildContextManifest(minimalPack());
    expect(manifest.intentType).toBe('status');
    expect(manifest.missingData).toContain('no_sensors');
    expect(manifest.layers.some((l) => l.layer === 'recent_events' && l.count === 1)).toBe(true);
    expect(manifest.layers.some((l) => l.layer === 'farm_profile' && l.count === 1)).toBe(true);
  });
});

describe('applyPromptCharBudget', () => {
  it('preserves tail guardrails when truncating', () => {
    const head = 'x'.repeat(30_000);
    const tail = '\n--- missing_data ---\nok\n--- guardrails ---\nok';
    const out = applyPromptCharBudget(head + tail);
    expect(out).toContain('--- guardrails ---');
    expect(out.length).toBeLessThan(head.length + tail.length);
  });
});
