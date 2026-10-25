import * as Localization from 'expo-localization';

/** BCP-47 tags from the device, highest priority first. */
export function getDeviceLanguageTags(): string[] {
  const fromLocales = Localization.getLocales()
    .map((loc) => loc.languageTag)
    .filter((tag): tag is string => Boolean(tag?.trim()));
  if (fromLocales.length > 0) return fromLocales;
  const fallback = Localization.getLocales()[0]?.languageCode;
  if (fallback) return [fallback];
  return ['en'];
}
