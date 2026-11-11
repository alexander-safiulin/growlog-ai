import { describe, expect, it } from 'vitest';
import {
  canTransitionSopRun,
  computeRunPriority,
  effectiveDueBoundaryIso,
  isRunPastDue,
  normalizeLocalTime,
  filterSopRunsForFocusDay,
  sortSopRunsForDailyFocus,
} from '@/lib/growlog/sop-engine-pure';
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
    anchor_date: null,
    due_at: '2026-06-01T12:00:00.000Z',
    status: 'open',
    priority: 'normal',
    reason_text: null,
    trigger_snapshot: {},
    ...overrides,
  };
}

/**
 * ADR-006: чистые правила SOP (дедлайны, переходы состояний, приоритет Daily Focus).
 */
describe('sop-engine-pure (ADR-006)', () => {
  it('effectiveDueBoundaryIso предпочитает due_window_end', () => {
    expect(
      effectiveDueBoundaryIso({
        due_at: '2026-01-01T00:00:00.000Z',
        due_window_end: '2026-01-02T00:00:00.000Z',
      })
    ).toBe('2026-01-02T00:00:00.000Z');
  });

  it('isRunPastDue сравнивает с effective boundary', () => {
    const now = new Date('2026-01-03T00:00:00.000Z');
    expect(
      isRunPastDue(now, {
        due_at: '2026-01-01T00:00:00.000Z',
        due_window_end: '2026-01-02T00:00:00.000Z',
      })
    ).toBe(true);
    expect(
      isRunPastDue(now, {
        due_at: '2026-01-05T00:00:00.000Z',
        due_window_end: null,
      })
    ).toBe(false);
  });

  it('canTransitionSopRun разрешает open → overdue и overdue → acknowledged', () => {
    expect(canTransitionSopRun('open', 'overdue')).toBe(true);
    expect(canTransitionSopRun('overdue', 'acknowledged')).toBe(true);
    expect(canTransitionSopRun('completed', 'open')).toBe(false);
  });

  it('computeRunPriority повышает normal/low при просрочке', () => {
    expect(
      computeRunPriority({
        criticality: 'medium',
        severity_if_missed: 'medium',
        isOverdue: true,
      })
    ).toBe('high');
    expect(
      computeRunPriority({
        criticality: 'low',
        severity_if_missed: 'low',
        isOverdue: true,
      })
    ).toBe('normal');
  });

  it('filterSopRunsForFocusDay: не показывает будущий anchor_date', () => {
    const today = runBase({
      id: 'today',
      anchor_date: '2026-11-11',
      status: 'open',
    });
    const future = runBase({
      id: 'future',
      anchor_date: '2026-11-15',
      status: 'open',
    });
    const overdue = runBase({
      id: 'late',
      anchor_date: '2026-11-09',
      status: 'overdue',
    });
    const filtered = filterSopRunsForFocusDay([today, future, overdue], '2026-11-11');
    expect(filtered.map((r) => r.id).sort()).toEqual(['late', 'today']);
  });

  it('sortSopRunsForDailyFocus: overdue и urgent выше остальных', () => {
    const a = runBase({
      id: 'a',
      status: 'open',
      priority: 'low',
      due_at: '2026-06-10T00:00:00.000Z',
    });
    const b = runBase({
      id: 'b',
      status: 'overdue',
      priority: 'normal',
      due_at: '2026-06-20T00:00:00.000Z',
    });
    const c = runBase({
      id: 'c',
      status: 'open',
      priority: 'urgent',
      due_at: '2026-06-01T00:00:00.000Z',
    });
    const sorted = sortSopRunsForDailyFocus([a, b, c]);
    expect(sorted[0]!.id).toBe('b');
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('normalizeLocalTime дополняет секунды и ведущие нули (минуты — две цифры)', () => {
    expect(normalizeLocalTime('9:05')).toBe('09:05:00');
    expect(normalizeLocalTime('09:05:07')).toBe('09:05:07');
  });
});
