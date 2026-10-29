import { getSiteUrl } from '@/lib/i18n/site-url';

export function buildGrowlogJsonLd(): Record<string, unknown>[] {
  const siteUrl = getSiteUrl();

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Growlog',
    alternateName: 'Growlog • OG Lab',
    url: siteUrl,
    logo: `${siteUrl}/og-logo.jpg`,
  };

  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Growlog',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: siteUrl,
    description:
      'Grow journal and farm management for cultivators: timeline, Tuya sensors, nutrient calculator, and cycle-aware AI grounded in your data.',
  };

  return [organization, softwareApplication];
}
