import { normalizeProductLocale, type ProductLocale } from './mobile-strings';

/** AI reply language stored on `farms.settings.ai_locale` (per farm, all devices). */
export const FARM_SETTINGS_AI_LOCALE_KEY = 'ai_locale';

/** @deprecated legacy single locale key; use {@link FARM_SETTINGS_AI_LOCALE_KEY}. */
export const FARM_SETTINGS_LEGACY_LOCALE_KEY = 'locale';

export function resolveAiLocaleFromFarmSettings(
  settings: Record<string, unknown> | null | undefined,
  fallback: ProductLocale = 'en'
): ProductLocale {
  const aiRaw = settings?.[FARM_SETTINGS_AI_LOCALE_KEY];
  if (typeof aiRaw === 'string' && aiRaw.trim()) {
    return normalizeProductLocale(aiRaw);
  }
  const legacy = settings?.[FARM_SETTINGS_LEGACY_LOCALE_KEY];
  if (typeof legacy === 'string' && legacy.trim()) {
    return normalizeProductLocale(legacy);
  }
  return normalizeProductLocale(fallback);
}

export function withFarmAiLocale(
  settings: Record<string, unknown> | null | undefined,
  aiLocale: ProductLocale
): Record<string, unknown> {
  const base = settings && typeof settings === 'object' ? { ...settings } : {};
  return { ...base, [FARM_SETTINGS_AI_LOCALE_KEY]: aiLocale };
}

export function farmMissingAiLocaleKey(
  settings: Record<string, unknown> | null | undefined
): boolean {
  const aiRaw = settings?.[FARM_SETTINGS_AI_LOCALE_KEY];
  return !(typeof aiRaw === 'string' && aiRaw.trim());
}
