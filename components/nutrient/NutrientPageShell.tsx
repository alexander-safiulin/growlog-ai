'use client';

import { NutrientPublicShell } from '@/components/nutrient/NutrientPublicShell';
import { useTranslation } from '@/components/providers/I18nProvider';

export function NutrientPageShell({
  titleKey,
  children,
}: {
  titleKey: 'titles.nutrientCalculator' | 'titles.nutrientSources';
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const titleShort =
    titleKey === 'titles.nutrientCalculator' ? t('titles.nutrientCalculatorShort') : undefined;
  return (
    <NutrientPublicShell title={t(titleKey)} titleShort={titleShort}>
      {children}
    </NutrientPublicShell>
  );
}
