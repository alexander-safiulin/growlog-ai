import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/i18n/site-url';
import { PUBLIC_INDEXABLE_PATHS, ROBOTS_DISALLOW_PREFIXES } from '@/lib/seo/public-pages';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/help', '/nutrient/'],
      disallow: [...ROBOTS_DISALLOW_PREFIXES],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
