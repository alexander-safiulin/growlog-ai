'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { NutrientHelpView } from '@/components/nutrient/help/NutrientHelpView';
import { getNutrientHelpContent } from '@/lib/nutrient/help/loader';

export function NutrientHelpPageContent() {
  const { locale, t } = useTranslation();
  const content = getNutrientHelpContent(locale) ?? getNutrientHelpContent('ru');

  if (!content) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  return <NutrientHelpView content={content} />;
}
