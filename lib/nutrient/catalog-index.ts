import type { CatalogBundle } from '@/lib/nutrient/catalog-types';

export interface CatalogIndex {
  bundle: CatalogBundle;
  sourceById: Map<string, CatalogBundle['sources'][0]>;
  sourceBySlug: Map<string, CatalogBundle['sources'][0]>;
  productById: Map<string, CatalogBundle['fertilizers'][0]>;
  profileBySlug: Map<string, CatalogBundle['target_profiles'][0]>;
}

export function buildCatalogIndex(bundle: CatalogBundle): CatalogIndex {
  const sourceById = new Map(bundle.sources.map((s) => [s.id, s]));
  const sourceBySlug = new Map(bundle.sources.map((s) => [s.slug, s]));
  const productById = new Map(bundle.fertilizers.map((p) => [p.id, p]));
  const profileBySlug = new Map(bundle.target_profiles.map((p) => [p.slug, p]));
  return { bundle, sourceById, sourceBySlug, productById, profileBySlug };
}

export function sourceContributionCounts(bundle: CatalogBundle): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of bundle.sources) counts[s.slug] = 0;
  for (const p of bundle.fertilizers) {
    const src = bundle.sources.find((s) => s.id === p.source_id);
    if (src) counts[src.slug] = (counts[src.slug] ?? 0) + 1;
  }
  for (const prof of bundle.target_profiles) {
    const src = bundle.sources.find((s) => s.id === prof.source_id);
    if (src) counts[src.slug] = (counts[src.slug] ?? 0) + 1;
  }
  return counts;
}
