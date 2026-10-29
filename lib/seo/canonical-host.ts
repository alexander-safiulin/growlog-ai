import { getSiteUrl } from '@/lib/i18n/site-url';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** @deprecated Alias for getSiteUrl(); apex origin used for host redirects. */
export function getCanonicalSiteOrigin(): string {
  return getSiteUrl();
}

function hostnameFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * 301 redirect www → apex when the request host matches www.{canonical hostname}.
 * Uses canonical origin from env (no request port leak). Returns null when no redirect applies.
 */
export function wwwToApexRedirectResponse(request: NextRequest): NextResponse | null {
  const requestHost = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!requestHost?.startsWith('www.')) return null;

  const apexHostname = hostnameFromOrigin(getSiteUrl());
  if (!apexHostname) return null;

  if (apexHostname === 'localhost' || apexHostname.endsWith('.localhost')) {
    return null;
  }

  const expectedWww = `www.${apexHostname}`;
  if (requestHost !== expectedWww) return null;

  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, getSiteUrl());
  if (target.hostname.startsWith('www.')) return null;

  return NextResponse.redirect(target, 301);
}
