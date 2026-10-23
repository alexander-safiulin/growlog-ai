'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { CycleDetail } from '@/components/cycle/CycleDetail';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useTranslation } from '@/components/providers/I18nProvider';

export default function CyclePage() {
  const { t } = useTranslation();
  return (
    <AppRouteReady>
      <PageHead titleKey="titles.cycle" />
      <AppShell title={t('titles.cycle')}>
        <CycleDetail />
      </AppShell>
    </AppRouteReady>
  );
}
