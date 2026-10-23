'use client';

import { CycleNutritionTab } from '@/components/cycle/CycleNutritionTab';
import { CycleOverview } from '@/components/cycle/CycleOverview';
import { CycleTimelineTab } from '@/components/cycle/CycleTimelineTab';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { VpdWidget } from '@/components/sensors/VpdWidget';
import { growerStageLabelRu, vpdStageLabelRu } from '@growlog/domain';
import Link from 'next/link';
import { useState } from 'react';

type CycleTab = 'overview' | 'timeline' | 'nutrition';

export function CycleDetail() {
  const { t } = useTranslation();
  const { cycle } = useFarmContext();
  const [tab, setTab] = useState<CycleTab>('overview');

  if (!cycle) {
    return <p className="text-sm text-muted-foreground">{t('cycle.noActive')}</p>;
  }

  const stageLabel =
    growerStageLabelRu(cycle.stage) || vpdStageLabelRu(cycle.stage);

  return (
    <div className="space-y-4">
      <header className="space-y-1 border-b border-border/60 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight">{cycle.name}</h1>
            <p className="text-sm text-muted-foreground">
              {stageLabel} · {t('common.since')} {cycle.start_date}
            </p>
            {cycle.cultivar_name ? (
              <p className="text-sm text-muted-foreground">
                {t('cycle.cultivar', { name: cycle.cultivar_name })}
              </p>
            ) : null}
          </div>
          <Link
            href="/cycle/new"
            className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('cycle.newCycle')}
          </Link>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ScrollableTabs
          aria-label={t('titles.cycle')}
          value={tab}
          onChange={setTab}
          items={[
            { id: 'overview', label: t('cycle.tabOverview') },
            { id: 'timeline', label: t('cycle.tabTimeline') },
            { id: 'nutrition', label: t('cycle.tabNutrition') },
          ]}
        />
      </div>

      {tab === 'overview' ? <CycleOverview /> : null}
      {tab === 'timeline' ? <CycleTimelineTab /> : null}
      {tab === 'nutrition' ? <CycleNutritionTab /> : null}

      <VpdWidget cycleStage={cycle.stage} cycleId={cycle.id} zoneId={cycle.zone_id} />
    </div>
  );
}
