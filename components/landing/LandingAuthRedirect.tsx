'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

/**
 * Client-only redirect for signed-in users. Marketing HTML is rendered as a sibling
 * (server-side) so crawlers always receive the full landing document.
 */
export function LandingAuthRedirect() {
  const router = useRouter();
  const { userId, authLoading } = useFarmContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && userId) {
      void router.replace('/dashboard');
    }
  }, [authLoading, userId, router]);

  if (!authLoading && !userId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 text-muted-foreground backdrop-blur-sm"
      aria-live="polite"
      aria-busy={authLoading}
    >
      {authLoading ? t('common.loading') : t('landing.redirectToJournal')}
    </div>
  );
}
