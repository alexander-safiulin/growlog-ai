'use client';

import { NutrientPublicShell } from '@/components/nutrient/NutrientPublicShell';
import { useTranslation } from '@/components/providers/I18nProvider';

export function NutrientPageShell({
  titleKey,
  children,
}: {
  titleKey: 'titles.nutrientCalculator' | 'titles.nutrientSources' | 'titles.nutrientHelp';
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return <NutrientPublicShell title={t(titleKey)}>{children}</NutrientPublicShell>;
}
