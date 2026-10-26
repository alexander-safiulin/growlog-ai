import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import type { CustomTargetProfile } from '@/lib/nutrient/custom-target-profile';

export function overdosePctForWorkspaceProfile(
  profile: CustomTargetProfile | CatalogBundle['target_profiles'][number] | undefined,
): Record<string, number> {
  return profile?.overdose_pct ?? {};
}
