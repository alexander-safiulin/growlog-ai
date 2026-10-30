'use client';

import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { previewGrowCycle } from '@/lib/preview/mock-farm-data';
import Link from 'next/link';

/**
 * Localhost-only: today cycles are surfaced via settings + nutrient plan, not a dedicated screen.
 * This preview documents the current fragmented UX before a unified «Циклы» hub.
 */
export default function PreviewCyclesCurrentPage() {
  useLocalhostPreviewGuard();
  const { t } = useTranslation();
  const cycle = previewGrowCycle;

  return (
    <>
      <PageHead titleKey="titles.settings" />
      <AppShell title="Циклы (как сейчас)">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Отдельного экрана «Циклы» в веб-приложении пока нет. Активный цикл виден в шапке (scope bar),
            в настройках и в калькуляторе питания при привязке системы кормления.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings.activeCycle')}</CardTitle>
              <CardDescription>
                {cycle.name} · {cycle.cultivar_name} · {cycle.stage}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                План питания:{' '}
                <Link href="/nutrient/calculator" className="text-primary underline-offset-2 hover:underline">
                  калькулятор → вкладка «Системы»
                </Link>
              </p>
              <p className="mt-2">
                История:{' '}
                <Link href="/timeline" className="text-primary underline-offset-2 hover:underline">
                  таймлайн событий
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  );
}
