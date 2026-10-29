import { ROBOTS_DISALLOW_PREFIXES } from '@/lib/seo/public-pages';

export const X_ROBOTS_NOINDEX = 'noindex, nofollow';

/** Whether middleware should attach X-Robots-Tag (non-indexable app/auth/API routes). */
export function shouldSendNoIndexHeader(pathname: string): boolean {
  const path = pathname.split('?')[0] ?? pathname;

  for (const rule of ROBOTS_DISALLOW_PREFIXES) {
    if (rule.endsWith('/')) {
      if (path.startsWith(rule)) return true;
      continue;
    }
    if (path === rule || path.startsWith(`${rule}/`)) return true;
  }

  return false;
}

export function applyNoIndexHeader(headers: Headers, pathname: string): void {
  if (shouldSendNoIndexHeader(pathname)) {
    headers.set('X-Robots-Tag', X_ROBOTS_NOINDEX);
  }
}
