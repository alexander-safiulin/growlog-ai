'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
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
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';

export type NutrientTabId = 'solutions' | 'fertilizers' | 'systems' | 'water' | 'elements' | 'wand';

const TAB_ORDER: NutrientTabId[] = ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'];

function NutrientCalculatorShell() {
  const { t } = useTranslation();
  const { mounted, tab, setTab } = useNutrientWorkspace();

  const tabLabels: Record<NutrientTabId, string> = {
    solutions: t('nutrient.tabs.solutions'),
    fertilizers: t('nutrient.tabs.fertilizers'),
    systems: t('nutrient.tabs.systems'),
    water: t('nutrient.tabs.water'),
    elements: t('nutrient.tabs.elements'),
    wand: t('nutrient.tabs.wand'),
  };

  if (!mounted) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-border">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2 text-sm font-medium rounded-t-md ${
              tab === id ? 'bg-muted border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            {tabLabels[id]}
          </button>
        ))}
      </nav>

      {tab === 'solutions' && <SolutionsTab />}
      {tab === 'fertilizers' && <FertilizersTab />}
      {tab === 'systems' && <SystemsTab />}
      {tab === 'water' && <WaterTab />}
      {tab === 'elements' && <ElementsTab />}
      {tab === 'wand' && <WandTab />}
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
