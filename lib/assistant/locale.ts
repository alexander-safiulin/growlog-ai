import { normalizeLocaleInput } from '@/lib/i18n/locale-detection';
import { PRODUCT_LOCALES, type ProductLocale } from '@/lib/i18n/locales';

export function normalizeProductLocale(value: string | null | undefined): ProductLocale {
  const mapped = normalizeLocaleInput(value ?? undefined);
  if (mapped && (PRODUCT_LOCALES as readonly string[]).includes(mapped)) {
    return mapped as ProductLocale;
  }
  if (mapped === 'uk') return 'ru';
  return 'en';
}

const LOCALE_REPLY: Record<ProductLocale, string> = {
  en: 'English',
  ru: 'Russian',
  th: 'Thai',
  it: 'Italian',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  vi: 'Vietnamese',
  my: 'Burmese (Unicode Myanmar script)',
};

export function assistantLanguageInstruction(locale: ProductLocale): string {
  return `Respond in ${LOCALE_REPLY[locale]}. Field body must use that language. JSON keys stay in English.`;
}

const PHOTO_ONLY_QUESTION: Record<ProductLocale, string> = {
  en: 'Analyze this photo in the context of the current farm and cycle.',
  ru: 'Проанализируй это фото в контексте текущей фермы и цикла.',
  th: 'Analyze this photo in the context of the current farm and cycle.',
  it: 'Analyze this photo in the context of the current farm and cycle.',
  fr: 'Analyze this photo in the context of the current farm and cycle.',
  es: 'Analyze this photo in the context of the current farm and cycle.',
  de: 'Analyze this photo in the context of the current farm and cycle.',
  vi: 'Analyze this photo in the context of the current farm and cycle.',
  my: 'Analyze this photo in the context of the current farm and cycle.',
};

export function assistantPhotoOnlyDefaultQuestion(locale: ProductLocale): string {
  return PHOTO_ONLY_QUESTION[locale] ?? PHOTO_ONLY_QUESTION.en;
}
