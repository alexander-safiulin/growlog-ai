import { afterEach, describe, expect, it } from 'vitest';
import { getSiteUrl, publicPageUrl } from '@/lib/i18n/site-url';

const originalSite = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercel = process.env.VERCEL_URL;

afterEach(() => {
  if (originalSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSite;
  if (originalVercel === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = originalVercel;
});

describe('getSiteUrl', () => {
  it('uses NEXT_PUBLIC_SITE_URL and strips one trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://growlog.example/';
    process.env.VERCEL_URL = 'ignored.vercel.app';
    expect(getSiteUrl()).toBe('https://growlog.example');
  });

  it('ignores VERCEL_URL when the site URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = 'growlog.vercel.app';
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('builds a public page URL from NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://growlog.example';
    expect(publicPageUrl('/timeline', 'en')).toBe('https://growlog.example/timeline');
    expect(publicPageUrl('/timeline', 'ru')).toBe('https://growlog.example/timeline?lang=ru');
  });
});
