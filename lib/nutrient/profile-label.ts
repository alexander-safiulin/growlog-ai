/** Resolve target profile label for current locale (falls back to catalog name). */
export function profileDisplayName(
  slug: string,
  catalogName: string,
  t: (key: string) => string,
): string {
  const key = `nutrient.profileNames.${slug}`;
  const translated = t(key);
  if (!translated || translated === key) return catalogName;
  return translated;
}
