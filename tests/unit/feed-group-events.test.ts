import { describe, expect, it } from 'vitest';

import { groupEventsByFarmDay, shiftFarmMonth, weekDatesContaining } from '@growlog/domain';
import type { EventRow } from '@growlog/domain';

function ev(id: string, occurred_at: string): EventRow {
  return {
    id,
    farm_id: 'f',
    cycle_id: 'c',
    scope_id: null,
    event_type: 'note',
    title: null,
    body: id,
    occurred_at,
    source_type: 'manual',
    payload: {},
    created_at: occurred_at,
  };
}

describe('groupEventsByFarmDay', () => {
  it('groups by farm TZ day and sorts newest first', () => {
    const sections = groupEventsByFarmDay(
      [
        ev('a', '2026-10-23T08:00:00.000Z'),
        ev('b', '2026-10-23T20:00:00.000Z'),
        ev('c', '2026-10-22T12:00:00.000Z'),
      ],
      'UTC',
    );
    expect(sections.map((s) => s.date)).toEqual(['2026-10-23', '2026-10-22']);
    expect(sections[0].events.map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('shiftFarmMonth', () => {
  it('wraps year boundaries', () => {
    expect(shiftFarmMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftFarmMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
});

describe('weekDatesContaining', () => {
  it('returns Monday–Sunday week for a date', () => {
    expect(weekDatesContaining('2026-10-23', 'UTC')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });
});
