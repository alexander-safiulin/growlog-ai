'use client';

import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { previewGrowCycle, previewMainScope } from '@/lib/preview/mock-farm-data';

/** Localhost-only snapshot of current settings UI. */
export default function PreviewSettingsPage() {
  useLocalhostPreviewGuard();
  const { t } = useTranslation();
  const cycle = previewGrowCycle;
  const scope = previewMainScope;

  return (
    <>
      <PageHead titleKey="titles.settings" />
      <AppShell title={t('titles.settings')}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.farm')}</CardTitle>
              <CardDescription>{t('settings.farmDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <Input value="Домашний сетап" readOnly />
                <Button type="button" size="sm">{t('settings.saveName')}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings.activeCycle')}</CardTitle>
              <CardDescription>
                {cycle.name} · {cycle.stage} · {t('common.since')} {cycle.start_date}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings.scopeTitle')}</CardTitle>
              <CardDescription>{t('settings.scopeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={scope.id}
                disabled
              >
                <option value={scope.id}>{scope.display_name}</option>
              </select>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  );
}
