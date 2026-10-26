import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import {
  hasUsableTargetPpm,
  normalizeCustomTargetName,
  targetPpmFromAchievedSolution,
} from './save-custom-target-profile';

export const GUEST_CUSTOM_TARGET_SLUG_PREFIX = 'guest-target:';

export type CustomTargetProfile = {
  slug: string;
  name: string;
  target_ppm: Record<string, number>;
  overdose_pct?: Record<string, number>;
};

export function guestCustomTargetSlug(id: string): string {
  return `${GUEST_CUSTOM_TARGET_SLUG_PREFIX}${id}`;
}

export function isGuestCustomTargetSlug(slug: string): boolean {
  return slug.startsWith(GUEST_CUSTOM_TARGET_SLUG_PREFIX);
}

export function customTargetProfilesFromGuest(
  rows: Array<{ id: string; name: string; target_ppm: Record<string, number>; overdose_pct?: Record<string, number> } | null> | null | undefined,
): CustomTargetProfile[] {
  if (!Array.isArray(rows)) return [];
  const out: CustomTargetProfile[] = [];
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id.trim()) continue;
    const name = normalizeCustomTargetName(typeof row.name === 'string' ? row.name : '');
    const target_ppm = targetPpmFromAchievedSolution(row.target_ppm);
    if (!name || !hasUsableTargetPpm(target_ppm)) continue;
    out.push({
      slug: guestCustomTargetSlug(row.id),
      name,
      target_ppm,
      overdose_pct: row.overdose_pct,
    });
  }
  return out;
}

export type TargetProfilePickerSections =
  | { mode: 'catalog_only'; catalog: CatalogBundle['target_profiles'] }
  | {
      mode: 'grouped';
      mine: CustomTargetProfile[];
      catalog: CatalogBundle['target_profiles'];
    };

export function buildTargetProfilePickerSections(
  catalog: CatalogBundle['target_profiles'],
  mine: CustomTargetProfile[],
): TargetProfilePickerSections {
  if (mine.length === 0) {
    return { mode: 'catalog_only', catalog };
  }
  return { mode: 'grouped', mine, catalog };
}

export function findWorkspaceTargetProfile(
  slug: string,
  catalog: CatalogBundle['target_profiles'],
  mine: CustomTargetProfile[],
): CustomTargetProfile | CatalogBundle['target_profiles'][number] | undefined {
  if (!slug) return undefined;
  const custom = mine.find((p) => p.slug === slug);
  if (custom) return custom;
  return catalog.find((p) => p.slug === slug);
}
