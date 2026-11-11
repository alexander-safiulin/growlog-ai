import { describe, expect, it } from 'vitest';
import { resolveAiLocaleFromFarmSettings, withFarmAiLocale } from '@growlog/domain';

describe('farm locale (ui vs ai)', () => {
  it('prefers ai_locale over legacy locale', () => {
    expect(
      resolveAiLocaleFromFarmSettings({ ai_locale: 'ru', locale: 'en' }, 'en')
    ).toBe('ru');
  });

  it('falls back to legacy locale then default', () => {
    expect(resolveAiLocaleFromFarmSettings({ locale: 'th' }, 'en')).toBe('th');
    expect(resolveAiLocaleFromFarmSettings({}, 'ru')).toBe('ru');
  });

  it('withFarmAiLocale sets ai_locale without dropping other keys', () => {
    const next = withFarmAiLocale({ escalation_matrix: { x: 1 } }, 'de');
    expect(next.ai_locale).toBe('de');
    expect(next.escalation_matrix).toEqual({ x: 1 });
  });
});
