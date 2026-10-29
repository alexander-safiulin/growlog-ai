import type { MetadataRoute } from 'next';
import { DEFAULT_LOCALE } from '@/lib/i18n/locales';
import { publicPageUrl } from '@/lib/i18n/site-url';
import { PUBLIC_INDEXABLE_PATHS, sitemapLanguageAlternates } from '@/lib/seo/public-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_INDEXABLE_PATHS.map((path) => ({
    url: publicPageUrl(path, DEFAULT_LOCALE),
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
    alternates: {
      languages: sitemapLanguageAlternates(path),
    },
  }));
}
