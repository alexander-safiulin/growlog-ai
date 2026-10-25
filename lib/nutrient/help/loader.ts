import type { NutrientHelpLocaleContent } from './types';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import vi from './locales/vi.json';

const BY_LOCALE: Record<string, NutrientHelpLocaleContent> = {
  en: en as NutrientHelpLocaleContent,
  ru: ru as NutrientHelpLocaleContent,
  fr: fr as NutrientHelpLocaleContent,
  de: de as NutrientHelpLocaleContent,
  es: es as NutrientHelpLocaleContent,
  it: it as NutrientHelpLocaleContent,
  th: th as NutrientHelpLocaleContent,
  vi: vi as NutrientHelpLocaleContent,
};

export function getNutrientHelpContent(locale: string): NutrientHelpLocaleContent | null {
  const key = locale.split('-')[0]?.toLowerCase() ?? 'en';
  return BY_LOCALE[key] ?? null;
}

export function nutrientHelpSectionHref(sectionId: string): string {
  return `/nutrient/help#${sectionId}`;
}
