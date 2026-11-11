import { describe, expect, it } from 'vitest';
import {
  formatGrowerCalendarDateForInput,
  parseGrowerCalendarDateInput,
  resolveGrowerSetupStartDate,
} from '@growlog/domain';

describe('grower calendar date input', () => {
  it('formats ISO to day-first', () => {
    expect(formatGrowerCalendarDateForInput('2026-11-11')).toBe('11.11.2026');
  });

  it('parses dotted and dashed day-first', () => {
    expect(parseGrowerCalendarDateInput('11.11.2026')).toBe('2026-11-11');
    expect(parseGrowerCalendarDateInput('1-2-2024')).toBe('2024-02-01');
  });

  it('still accepts pasted ISO', () => {
    expect(parseGrowerCalendarDateInput('2026-11-11')).toBe('2026-11-11');
  });

  it('rejects invalid and future vs today', () => {
    expect(parseGrowerCalendarDateInput('31.02.2026')).toBeNull();
    expect(resolveGrowerSetupStartDate('12.11.2026', '2026-11-11')).toBeNull();
    expect(resolveGrowerSetupStartDate('10.11.2026', '2026-11-11')).toBe('2026-11-10');
  });
});
