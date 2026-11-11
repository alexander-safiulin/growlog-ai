import { describe, expect, it } from 'vitest';
import {
  agendaFactLines,
  assistantModelFromAgenda,
  buildDailyFocusAgenda,
  dailyFocusGroundingPassesAgenda,
  focusPackHasSignalsToday,
} from '@growlog/domain';
import type { AnswerAssemblyContext } from '@growlog/domain';

function emptyPack(): AnswerAssemblyContext {
  return {
    scope: { farmId: 'f', scopeId: 's', cycleId: 'c', resolved: true },
    missingData: [],
    recentEvents: [],
    sensorContext: [],
    photoContext: [],
    photoTimelineSignals: [],
    sopContext: [],
    anomalyContext: [],
    causalContext: [],
    historicalContext: [],
    dailyTimelines: [],
    environmentalStats: [],
    conversationHistory: [],
    intent: { kind: 'daily_focus', requiresSopContext: true },
    guardrails: [],
    feedingTrend7d: null,
    approvedProcedures: [],
    cycleBrief: {
      cultivarSummary: null,
      plantCount: 0,
      plants: [],
      light: null,
      recentFeedings: [],
      growerJournalEvents: [],
      sensorDailyStats: [],
      sensorLatestByMetric: [],
      unloadedScopes: [],
    },
  } as AnswerAssemblyContext;
}

describe('focus worker gates (pure)', () => {
  it('focusPackHasSignalsToday игнорирует sensorDailyStats не за focusDate', () => {
    const pack = emptyPack();
    pack.cycleBrief!.sensorDailyStats = [
      {
        id: 's1',
        statDate: '2026-11-10',
        metricCode: 'temp',
        metricName: 'Temp',
        minValue: 1,
        maxValue: 2,
        avgValue: 1.5,
        readingCount: 3,
        unit: 'C',
      },
    ];
    const has = focusPackHasSignalsToday(
      pack,
      '2026-11-11T00:00:00.000Z',
      '2026-11-11T23:59:59.999Z',
      '2026-11-11'
    );
    expect(has).toBe(false);
  });

  it('focusPackHasSignalsToday игнорирует старые события вне окна', () => {
    const pack = emptyPack();
    pack.recentEvents = [
      {
        id: '1',
        occurredAt: '2020-01-01T12:00:00.000Z',
        eventType: 'note',
        title: null,
        body: 'old',
        scopeId: null,
        severity: null,
        relevanceScore: 1,
      },
    ];
    const has = focusPackHasSignalsToday(
      pack,
      '2026-11-11T00:00:00.000Z',
      '2026-11-11T23:59:59.999Z',
      '2026-11-11'
    );
    expect(has).toBe(false);
  });

  it('assistantModelFromAgenda без задач — честный текст', () => {
    const agenda = buildDailyFocusAgenda({ focusDate: '2026-11-11', runs: [] });
    const model = assistantModelFromAgenda(agenda, emptyPack(), { locale: 'ru' });
    expect(model.body).toContain('нет');
    expect(agendaFactLines(agenda)).toHaveLength(0);
  });

  it('пустая повестка отклоняет выдуманные sop_run в grounding', () => {
    const agenda = buildDailyFocusAgenda({ focusDate: '2026-11-11', runs: [] });
    expect(
      dailyFocusGroundingPassesAgenda(agenda, [{ source_type: 'sop_run', source_id: 'fake' }])
    ).toBe(false);
    expect(dailyFocusGroundingPassesAgenda(agenda, [{ source_type: 'event', source_id: 'e1' }])).toBe(
      true
    );
  });

  it('grounding fail когда нет top run', () => {
    const agenda = buildDailyFocusAgenda({
      focusDate: '2026-11-11',
      runs: [
        {
          id: 'top-run',
          farm_id: 'f',
          sop_definition_id: 'd',
          trigger_id: null,
          assignment_id: null,
          cycle_id: 'c',
          scope_id: null,
          anchor_date: '2026-11-11',
          due_at: null,
          status: 'open',
          priority: 'normal',
          reason_text: null,
          trigger_snapshot: {},
          sop_definitions: { title: 'Task', description: null },
        },
      ],
    });
    expect(
      dailyFocusGroundingPassesAgenda(agenda, [{ source_type: 'event', source_id: 'x' }])
    ).toBe(false);
  });
});
