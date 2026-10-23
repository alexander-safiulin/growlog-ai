'use client';

import { NutrientPublicShell } from '@/components/nutrient/NutrientPublicShell';

export function NutrientPageShell({
  titleKey: _titleKey,
  children,
}: {
  titleKey: 'titles.nutrientCalculator' | 'titles.nutrientSources' | 'titles.nutrientHelp';
  children: React.ReactNode;
}) {
  void _titleKey;
  return <NutrientPublicShell>{children}</NutrientPublicShell>;
}
