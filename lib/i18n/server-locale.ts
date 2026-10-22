import { normalizeLocaleInput } from '@/lib/i18n/locale-detection';
import { LOCALE_COOKIE_KEY, type Locale } from '@/lib/i18n/locales';
import { getServerFallbackLocale } from '@/lib/i18n/locale-persist';
import type { GetServerSidePropsContext, NextPageContext } from 'next';

function cookieFromHeader(cookieHeader: string | undefined): Locale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  return normalizeLocaleInput(raw);
}

/** Resolve locale for SSR from request cookies (avoids ru hydration mismatch). */
export function resolveServerLocale(
  ctx: Pick<NextPageContext, 'req'> | Pick<GetServerSidePropsContext, 'req'>,
): Locale {
  const fromCookie = cookieFromHeader(ctx.req?.headers.cookie);
  return fromCookie ?? getServerFallbackLocale();
}
