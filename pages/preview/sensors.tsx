'use client';

import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Droplets, Thermometer } from 'lucide-react';

/** Localhost-only snapshot of current sensors + manual entry UI (VPD widget omitted — needs devices). */
export default function PreviewSensorsPage() {
  useLocalhostPreviewGuard();
  const { t } = useTranslation();

  return (
    <>
      <PageHead titleKey="titles.sensors" />
      <AppShell title={t('titles.sensors')}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4" />
                VPD
              </CardTitle>
              <CardDescription>{t('vpd.desc')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Воздух</p>
                <p className="text-lg font-semibold tabular-nums">24,2 °C</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Влажность</p>
                <p className="text-lg font-semibold tabular-nums">58 %</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-xs text-muted-foreground">VPD</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  1,12 кПа
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('sensors.title')}</CardTitle>
              <CardDescription>{t('sensors.desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sensors.metric')}</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option>pH субстрата</option>
                  <option>EC раствора</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sensors.value')}</label>
                <Input inputMode="decimal" placeholder="6,2" defaultValue="6,2" readOnly />
              </div>
              <Button type="button" className="gap-2">
                <Droplets className="h-4 w-4" />
                {t('sensors.submit')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  );
}
