import { describe, expect, it } from 'vitest';
import { formatLocaleDecimal } from '@/lib/i18n/format-locale-number';

describe('formatLocaleDecimal', () => {
  it('uses comma decimal separator for ru', () => {
    expect(formatLocaleDecimal(120.6, 'ru', 2)).toBe('120,60');
  });

  it('uses dot decimal separator for en', () => {
    expect(formatLocaleDecimal(120.6, 'en', 2)).toBe('120.60');
  });
});
