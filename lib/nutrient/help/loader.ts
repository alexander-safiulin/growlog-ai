import type { NutrientHelpLocaleContent } from './types';
import en from './locales/en.json';
import ru from './locales/ru.json';

const BY_LOCALE: Record<string, NutrientHelpLocaleContent> = {
  en: en as NutrientHelpLocaleContent,
  ru: ru as NutrientHelpLocaleContent,
};

export function getNutrientHelpContent(locale: string): NutrientHelpLocaleContent | null {
  const key = locale.split('-')[0]?.toLowerCase() ?? 'en';
  return BY_LOCALE[key] ?? null;
}

export function nutrientHelpSectionHref(sectionId: string): string {
  return `/nutrient/help#${sectionId}`;
}
