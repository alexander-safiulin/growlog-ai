'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { NewCycleForm } from '@/components/cycle/NewCycleForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useTranslation } from '@/components/providers/I18nProvider';

export default function NewCyclePage() {
  const { t } = useTranslation();
  return (
    <AppRouteReady>
      <PageHead titleKey="cycle.formTitleNew" />
      <AppShell title={t('cycle.formTitleNew')}>
        <NewCycleForm />
      </AppShell>
    </AppRouteReady>
  );
}
