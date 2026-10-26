'use client';

import { profileDisplayName } from '@/lib/nutrient/profile-label';
import type { TargetProfilePickerSections } from '@/lib/nutrient/custom-target-profile';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import type { CustomTargetProfile } from '@/lib/nutrient/custom-target-profile';

type TFn = (key: string, params?: Record<string, string>) => string;

function catalogOption(
  p: CatalogBundle['target_profiles'][number],
  t: TFn,
) {
  return (
    <option key={p.slug} value={p.slug}>
      {profileDisplayName(p.slug, p.name, t)}
    </option>
  );
}

function mineOption(p: CustomTargetProfile) {
  return (
    <option key={p.slug} value={p.slug}>
      {p.name}
    </option>
  );
}

export function TargetProfileSelectOptions({
  sections,
  t,
  locale,
}: {
  sections: TargetProfilePickerSections;
  t: TFn;
}) {
  if (sections.mode === 'catalog_only') {
    return <>{sections.catalog.map((p) => catalogOption(p, t))}</>;
  }
  return (
    <>
      <optgroup label={t('nutrient.targetProfileMine')}>
        {sections.mine.map((p) => mineOption(p))}
      </optgroup>
      <optgroup label={t('nutrient.targetProfileCatalog')}>
        {sections.catalog.map((p) => catalogOption(p, t))}
      </optgroup>
    </>
  );
}
