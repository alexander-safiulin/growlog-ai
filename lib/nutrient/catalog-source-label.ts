export function catalogSourceDisplayName(
  slug: string,
  fallbackName: string,
  t: (key: string) => string,
): string {
  const key = `nutrient.catalogSources.${slug}`;
  const translated = t(key);
  if (translated === key) return fallbackName;
  return translated;
}
