import { DEFAULT_LOCALE, LOCALE_HREFLANG, LOCALES, type Locale } from '@/lib/i18n/locales';
import { messagesByLocale } from '@/lib/i18n/messages';
import { createTranslator, pageTitle } from '@/lib/i18n/translate';
import { publicPageUrl } from '@/lib/i18n/site-url';

/** Marketing routes that should appear in the sitemap and receive indexable metadata. */
export const PUBLIC_INDEXABLE_PATHS = [
  '/',
  '/help',
  '/nutrient/calculator',
  '/nutrient/help',
  '/nutrient/sources',
] as const;

export type PublicIndexablePath = (typeof PUBLIC_INDEXABLE_PATHS)[number];

export type PublicSeoPageKey =
  | 'home'
  | 'help'
  | 'nutrientCalculator'
  | 'nutrientHelp'
  | 'nutrientSources'
  | 'login';

const PATH_BY_KEY: Record<PublicSeoPageKey, string> = {
  home: '/',
  help: '/help',
  nutrientCalculator: '/nutrient/calculator',
  nutrientHelp: '/nutrient/help',
  nutrientSources: '/nutrient/sources',
  login: '/auth/login',
};

export function publicPathForSeoKey(key: PublicSeoPageKey): string {
  return PATH_BY_KEY[key];
}

export function publicSeoCopy(
  key: PublicSeoPageKey,
  locale: Locale = DEFAULT_LOCALE,
): { title: string; description: string } {
  const t = createTranslator(messagesByLocale[locale]);
  const title = pageTitle(t, `seo.${key}.title`);
  const description = t(`seo.${key}.description`);
  return { title, description };
}

export function sitemapLanguageAlternates(path: PublicIndexablePath): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[LOCALE_HREFLANG[locale]] = publicPageUrl(path, locale);
  }
  languages['x-default'] = publicPageUrl(path, DEFAULT_LOCALE);
  return languages;
}

/** Paths that must not be indexed (app shell, auth, APIs). */
export const ROBOTS_DISALLOW_PREFIXES = [
  '/api/',
  '/auth/',
  '/dashboard',
  '/preview/',
  '/cms/',
  '/onboarding',
  '/assistant',
  '/timeline',
  '/calendar',
  '/cycle',
  '/log',
  '/photos',
  '/sensors',
  '/settings',
  '/reports',
  '/sop',
  '/handover',
] as const;
