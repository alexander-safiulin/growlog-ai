'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { VpdWidget } from '@/components/sensors/VpdWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { vpdStageLabelRu } from '@growlog/domain';

function CyclePageBody() {
  const { t } = useTranslation();
  const { cycle } = useFarmContext();

  if (!cycle) {
    return <p className="text-sm text-muted-foreground">{t('cycle.noActive')}</p>;
  }

  const stageLabel = vpdStageLabelRu(cycle.stage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{cycle.name}</CardTitle>
          <CardDescription>
            {stageLabel} · {t('common.since')} {cycle.start_date}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {cycle.cultivar_name ? t('cycle.cultivar', { name: cycle.cultivar_name }) : null}
        </CardContent>
      </Card>

      <VpdWidget cycleStage={cycle.stage} cycleId={cycle.id} zoneId={cycle.zone_id} />
    </div>
  );
}

export default function CyclePage() {
  const { t } = useTranslation();
  return (
    <AppRouteReady>
      <PageHead titleKey="titles.cycle" />
      <AppShell title={t('titles.cycle')}>
        <CyclePageBody />
      </AppShell>
    </AppRouteReady>
  );
}
