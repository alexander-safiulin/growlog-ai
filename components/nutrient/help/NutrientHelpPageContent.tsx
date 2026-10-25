'use client';

import Head from 'next/head';
import { useTranslation } from '@/components/providers/I18nProvider';
import { NutrientHelpView } from '@/components/nutrient/help/NutrientHelpView';
import { getNutrientHelpContent } from '@/lib/nutrient/help/loader';

export function NutrientHelpPageContent() {
  const { locale, t } = useTranslation();
  const content = getNutrientHelpContent(locale) ?? getNutrientHelpContent('en');

  if (!content) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <>
      <Head>
        <title>{t('titles.nutrientHelpPageTitle')}</title>
      </Head>
      <NutrientHelpView content={content} />
    </>
  );
}
