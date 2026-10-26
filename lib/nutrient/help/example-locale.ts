export const HELP_EXAMPLE_LOCALES = ['en', 'ru', 'fr', 'de', 'es', 'it', 'th', 'vi'] as const;
export type HelpExampleLocale = (typeof HELP_EXAMPLE_LOCALES)[number];

export function normalizeHelpExampleLocale(locale: string | undefined | null): HelpExampleLocale {
  const base = (locale ?? 'en').split('-')[0]?.toLowerCase() ?? 'en';
  if (base === 'uk') return 'ru';
  if ((HELP_EXAMPLE_LOCALES as readonly string[]).includes(base)) return base as HelpExampleLocale;
  return 'en';
}

export function fmtHelpNumber(locale: HelpExampleLocale, n: number, maxFractionDigits = 3): string {
  const tag =
    locale === 'ru'
      ? 'ru-RU'
      : locale === 'de'
        ? 'de-DE'
        : locale === 'fr'
          ? 'fr-FR'
          : locale === 'es'
            ? 'es-ES'
            : locale === 'it'
              ? 'it-IT'
              : locale === 'th'
                ? 'th-TH'
                : locale === 'vi'
                  ? 'vi-VN'
                  : 'en-US';
  return n.toLocaleString(tag, { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits });
}
