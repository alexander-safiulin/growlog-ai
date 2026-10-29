import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getCanonicalSiteOrigin, wwwToApexRedirectResponse } from '@/lib/seo/canonical-host';

const originalSite = process.env.NEXT_PUBLIC_SITE_URL;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSite;
  process.env.NODE_ENV = originalNodeEnv;
});

describe('wwwToApexRedirectResponse', () => {
  it('redirects www to apex using NEXT_PUBLIC_SITE_URL without leaking ports', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://growlog.ai';
    const request = new NextRequest('http://www.growlog.ai:8080/pricing?utm=1', {
      headers: { host: 'www.growlog.ai:8080' },
    });

    const response = wwwToApexRedirectResponse(request);
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://growlog.ai/pricing?utm=1');
  });

  it('does not redirect apex host', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://growlog.ai';
    const request = new NextRequest('https://growlog.ai/', {
      headers: { host: 'growlog.ai' },
    });
    expect(wwwToApexRedirectResponse(request)).toBeNull();
  });

  it('does not redirect unrelated www hosts', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://growlog.ai';
    const request = new NextRequest('https://www.example.com/', {
      headers: { host: 'www.example.com' },
    });
    expect(wwwToApexRedirectResponse(request)).toBeNull();
  });

  it('does not redirect on localhost www', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = 'development';
    const request = new NextRequest('http://www.localhost:3000/', {
      headers: { host: 'www.localhost:3000' },
    });
    expect(wwwToApexRedirectResponse(request)).toBeNull();
  });

  it('falls back to production apex when env is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = 'production';
    expect(getCanonicalSiteOrigin()).toBe('https://growlog.ai');
  });
});
