'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { NutrientContextHelpLink } from '@/components/nutrient/help/NutrientContextHelpLink';
import { ElementsTab } from '@/components/nutrient/workspace/ElementsTab';
import { FertilizersTab } from '@/components/nutrient/workspace/FertilizersTab';
import {
  NutrientWorkspaceProvider,
  useNutrientWorkspace,
} from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { SolutionsTab } from '@/components/nutrient/workspace/SolutionsTab';
import { SystemsTab } from '@/components/nutrient/workspace/SystemsTab';
import { WaterTab } from '@/components/nutrient/workspace/WaterTab';
import { WandTab } from '@/components/nutrient/workspace/WandTab';
import { AppUpdateBanner } from '@/components/nutrient/AppUpdateBanner';
import { NutrientCloudSyncPrompt } from '@/components/nutrient/NutrientCloudSyncPrompt';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';

export type NutrientTabId = 'solutions' | 'fertilizers' | 'systems' | 'water' | 'elements' | 'wand';

const TAB_ORDER: NutrientTabId[] = ['fertilizers', 'solutions', 'wand', 'systems', 'water', 'elements'];

function NutrientCalculatorShell() {
  const { t } = useTranslation();
  const { mounted, tab, setTab, isCloudSynced } = useNutrientWorkspace();

  const tabLabels: Record<NutrientTabId, string> = {
    solutions: t('nutrient.tabs.solutions'),
    fertilizers: t('nutrient.tabs.fertilizers'),
    systems: t('nutrient.tabs.systems'),
    water: t('nutrient.tabs.water'),
    elements: t('nutrient.tabs.elements'),
    wand: t('nutrient.tabs.wand'),
  };
  const tabItems = TAB_ORDER.map((id) => ({ id, label: tabLabels[id] }));

  if (!mounted) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AppUpdateBanner />
      {!isCloudSynced && <NutrientCloudSyncPrompt />}
      <div className="flex items-center gap-1">
        <ScrollableTabs
          className="min-w-0 flex-1"
          items={tabItems}
          value={tab}
          onChange={setTab}
          aria-label={t('nutrient.tabsAria')}
        />
        <NutrientContextHelpLink context={tab} className="h-11 w-11 shrink-0" />
      </div>

      <div key={tab} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
        {tab === 'solutions' && <SolutionsTab />}
        {tab === 'fertilizers' && <FertilizersTab />}
        {tab === 'systems' && <SystemsTab />}
        {tab === 'water' && <WaterTab />}
        {tab === 'elements' && <ElementsTab />}
        {tab === 'wand' && <WandTab />}
      </div>
    </div>
  );
}

export function NutrientCalculatorApp({ catalog }: { catalog: CatalogBundle }) {
  return (
    <NutrientWorkspaceProvider catalog={catalog}>
      <NutrientCalculatorShell />
    </NutrientWorkspaceProvider>
  );
}
