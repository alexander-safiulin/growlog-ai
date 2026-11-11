import { describe, expect, it } from 'vitest';
import {
  agendaFactLines,
  buildDailyFocusAgenda,
  dailyFocusGroundingPassesAgenda,
  deterministicDailyFocusBodyFromAgenda,
} from '@growlog/domain';
import type { SopRunRow } from '@/types/sop';

function runBase(overrides: Partial<SopRunRow> = {}): SopRunRow {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    farm_id: '00000000-0000-4000-8000-000000000002',
    sop_definition_id: '00000000-0000-4000-8000-000000000003',
    trigger_id: null,
    assignment_id: null,
    cycle_id: null,
    scope_id: null,
    anchor_date: '2026-11-11',
    due_at: '2026-11-11T12:00:00.000Z',
    status: 'open',
    priority: 'normal',
    reason_text: 'Daily schedule',
    trigger_snapshot: {},
    sop_definitions: { title: 'Check runoff', description: null },
    ...overrides,
  };
}

describe('buildDailyFocusAgenda (ADR-006)', () => {
  it('кладёт overdue выше open и группирует по bucket', () => {
    const overdue = runBase({
      id: 'overdue-1',
      status: 'overdue',
      priority: 'normal',
      sop_definitions: { title: 'Overdue task', description: null },
    });
    const urgent = runBase({
      id: 'urgent-1',
      status: 'open',
      priority: 'urgent',
      sop_definitions: { title: 'Critical today', description: null },
    });
    const agenda = buildDailyFocusAgenda({
      focusDate: '2026-11-11',
      runs: [urgent, overdue],
    });
    expect(agenda.orderedRuns[0]!.runId).toBe('overdue-1');
    expect(agenda.overdue).toHaveLength(1);
    expect(agenda.dueTodayCritical).toHaveLength(1);
  });

  it('deterministic body начинается с первой задачи', () => {
    const agenda = buildDailyFocusAgenda({
      focusDate: '2026-11-11',
      runs: [
        runBase({
          id: 'a',
          sop_definitions: { title: 'Polish', description: null },
          reason_text: 'Stage drying',
        }),
      ],
    });
    const body = deterministicDailyFocusBodyFromAgenda(agenda, { locale: 'ru' });
    expect(body.title).toContain('2026-11-11');
    expect(body.body).toContain('Polish');
    expect(body.body).toContain('Stage drying');
  });

  it('grounding trust требует top run id', () => {
    const agenda = buildDailyFocusAgenda({
      focusDate: '2026-11-11',
      runs: [runBase({ id: 'top' }), runBase({ id: 'second' })],
    });
    expect(
      dailyFocusGroundingPassesAgenda(agenda, [{ source_type: 'sop_run', source_id: 'top' }])
    ).toBe(true);
    expect(
      dailyFocusGroundingPassesAgenda(agenda, [{ source_type: 'sop_run', source_id: 'second' }])
    ).toBe(false);
    expect(
      dailyFocusGroundingPassesAgenda(agenda, [{ source_type: 'sop_run', source_id: 'unknown' }])
    ).toBe(false);
  });

  it('agendaFactLines включает run и upcoming', () => {
    const agenda = buildDailyFocusAgenda({
      focusDate: '2026-11-11',
      runs: [runBase({ id: 'r1' })],
      upcoming: [
        {
          sopDefinitionId: 'd1',
          definitionTitle: 'Feed',
          triggerId: 't1',
          anchorDate: '2026-11-12',
          reasonText: 'Daily',
          localTime: '09:00:00',
          triggerType: 'recurring_daily',
        },
      ],
    });
    const lines = agendaFactLines(agenda);
    expect(lines.some((l) => l.includes('r1'))).toBe(true);
    expect(lines.some((l) => l.includes('upcoming'))).toBe(true);
  });
});
