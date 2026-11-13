'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

/** Requires session and at least one farm; otherwise redirects to login / onboarding. */
export function AppRouteReady({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { authLoading, userId, farmListReady, farms, pendingFarmInvitations } = useFarmContext();
  const needsOnboarding = farms.length === 0 && pendingFarmInvitations.length === 0;

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      void router.replace('/auth/login');
      return;
    }
    if (!farmListReady) return;
    if (needsOnboarding) {
      void router.replace('/onboarding');
    }
  }, [authLoading, userId, farmListReady, needsOnboarding, router]);

  if (authLoading || !userId || !farmListReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('common.redirecting')}
      </div>
    );
  }

  return <>{children}</>;
}
