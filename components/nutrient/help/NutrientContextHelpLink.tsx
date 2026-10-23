'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { getNutrientHelpContent, nutrientHelpSectionHref } from '@/lib/nutrient/help/loader';
import type { NutrientHelpSectionId } from '@/lib/nutrient/help/types';
import { useTranslation } from '@/components/providers/I18nProvider';

export type NutrientHelpContextKey =
  | 'solutions'
  | 'fertilizers'
  | 'systems'
  | 'water'
  | 'elements'
  | 'wand'
  | 'results';

export function NutrientContextHelpLink({
  context,
  className,
}: {
  context: NutrientHelpContextKey;
  className?: string;
}) {
  const { locale, t } = useTranslation();
  const content = getNutrientHelpContent(locale);
  const sectionId = (content?.contextMap[context] ?? 'quick-start') as NutrientHelpSectionId;
  const href = nutrientHelpSectionHref(sectionId);

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ''}`}
      aria-label={t('nutrient.help.openSection')}
      title={t('nutrient.help.openSection')}
    >
      <HelpCircle className="h-4 w-4" aria-hidden />
    </Link>
  );
}
