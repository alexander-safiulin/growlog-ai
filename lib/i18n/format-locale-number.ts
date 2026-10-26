import type { Locale } from '@/lib/i18n/locales';

const BCP47: Record<Locale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  ru: 'ru-RU',
  uk: 'uk-UA',
  cs: 'cs-CZ',
  nl: 'nl-NL',
  zh: 'zh-CN',
  th: 'th-TH',
  vi: 'vi-VN',
  my: 'my-MM',
};

export function localeToBcp47(locale: Locale): string {
  return BCP47[locale] ?? 'en-US';
}

export function formatLocaleNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeToBcp47(locale), options).format(value);
}

export function formatLocaleDecimal(
  value: number,
  locale: Locale,
  fractionDigits: number,
): string {
  return formatLocaleNumber(value, locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
