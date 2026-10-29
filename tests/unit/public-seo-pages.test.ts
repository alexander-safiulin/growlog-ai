import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '@/lib/i18n/locales';
import { publicPageUrl } from '@/lib/i18n/site-url';
import {
  PUBLIC_INDEXABLE_PATHS,
  publicSeoCopy,
  sitemapLanguageAlternates,
} from '@/lib/seo/public-pages';

const originalSite = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSite;
});

describe('public SEO pages', () => {
  it('lists only marketing paths in the sitemap set', () => {
    expect(PUBLIC_INDEXABLE_PATHS).toEqual([
      '/',
      '/help',
      '/nutrient/calculator',
      '/nutrient/help',
      '/nutrient/sources',
    ]);
  });

  it('builds locale alternates on apex URLs', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://growlog.ai';
    const languages = sitemapLanguageAlternates('/help');
    expect(languages.en).toBe('https://growlog.ai/help');
    expect(languages.ru).toBe('https://growlog.ai/help?lang=ru');
    expect(languages['x-default']).toBe(publicPageUrl('/help', DEFAULT_LOCALE));
  });

  it('provides unique EN and RU titles for home', () => {
    const en = publicSeoCopy('home', 'en');
    const ru = publicSeoCopy('home', 'ru');
    expect(en.title).not.toBe(ru.title);
    expect(en.description).not.toBe(ru.description);
  });
});
