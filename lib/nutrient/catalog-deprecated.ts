/** Catalog rows marked deprecated after P5 dedupe (legacy external_key); hide from pickers and counts. */
export function isCatalogProductDeprecated(metadata?: Record<string, unknown> | null): boolean {
  return metadata?.catalog_deprecated === true;
}

export function activeCatalogFertilizers<T extends { metadata?: Record<string, unknown> }>(
  fertilizers: T[],
): T[] {
  return fertilizers.filter((p) => !isCatalogProductDeprecated(p.metadata));
}
