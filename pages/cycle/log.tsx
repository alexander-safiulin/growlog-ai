'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { WateringFeedingForm } from '@/components/cycle/WateringFeedingForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useRouter } from 'next/router';

export default function CycleLogPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const kind = router.query.kind === 'feeding' ? 'feeding' : 'watering';
  const title = kind === 'feeding' ? t('cycle.logTitleFeed') : t('cycle.logTitleWater');

  return (
    <AppRouteReady>
      <PageHead titleKey={kind === 'feeding' ? 'cycle.logTitleFeed' : 'cycle.logTitleWater'} />
      <AppShell title={title}>
        <WateringFeedingForm kind={kind} />
      </AppShell>
    </AppRouteReady>
  );
}
