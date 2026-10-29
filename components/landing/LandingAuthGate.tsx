'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useRouter } from 'next/router';
import { useEffect, type ReactNode } from 'react';

/** Redirects authenticated users to the app shell (client-only; marketing HTML stays in DOM for crawlers). */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userId, authLoading } = useFarmContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && userId) {
      void router.replace('/dashboard');
    }
  }, [authLoading, userId, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (userId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('landing.redirectToJournal')}
      </div>
    );
  }

  return children;
}
