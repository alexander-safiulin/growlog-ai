import { describe, expect, it } from 'vitest';
import {
  detectProductLocaleFromDeviceTags,
  mapDeviceTagToProductLocale,
  normalizeProductLocale,
} from '@growlog/domain/i18n/mobile-strings';

describe('mobile product locale', () => {
  it('maps device tags to product locales', () => {
    expect(mapDeviceTagToProductLocale('it-IT')).toBe('it');
    expect(mapDeviceTagToProductLocale('vi')).toBe('vi');
    expect(mapDeviceTagToProductLocale('uk-UA')).toBe('ru');
  });

  it('prefers saved locale over device list when normalizing stored value', () => {
    expect(normalizeProductLocale('de-DE')).toBe('de');
    expect(normalizeProductLocale('xx')).toBe('en');
  });

  it('walks device language tags in order', () => {
    expect(detectProductLocaleFromDeviceTags(['xx', 'fr-FR', 'en'])).toBe('fr');
    expect(detectProductLocaleFromDeviceTags(['vi-VN'])).toBe('vi');
    expect(detectProductLocaleFromDeviceTags(['xx'])).toBe('en');
  });
});
