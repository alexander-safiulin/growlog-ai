import { describe, expect, it } from 'vitest';
import {
  buildTargetProfilePickerSections,
  customTargetProfilesFromGuest,
  findWorkspaceTargetProfile,
  guestCustomTargetSlug,
} from '@/lib/nutrient/custom-target-profile';

describe('target profile picker sections', () => {
  const catalog = [
    { slug: 'hoagland-standard', name: 'Hoagland', target_ppm: { N: 1 }, overdose_pct: {} },
  ] as const;

  it('uses catalog_only when no custom targets', () => {
    const sections = buildTargetProfilePickerSections([...catalog], []);
    expect(sections.mode).toBe('catalog_only');
    if (sections.mode === 'catalog_only') {
      expect(sections.catalog).toHaveLength(1);
    }
  });

  it('groups mine above catalog when custom targets exist', () => {
    const mine = customTargetProfilesFromGuest([
      { id: 'a', name: 'My veg tank', target_ppm: { N: 100 } },
    ]);
    const sections = buildTargetProfilePickerSections([...catalog], mine);
    expect(sections.mode).toBe('grouped');
    if (sections.mode === 'grouped') {
      expect(sections.mine[0].slug).toBe(guestCustomTargetSlug('a'));
      expect(sections.catalog).toHaveLength(1);
    }
  });

  it('resolves custom slug before catalog', () => {
    const mine = customTargetProfilesFromGuest([
      { id: 'x', name: 'Custom', target_ppm: { K: 50 } },
    ]);
    const hit = findWorkspaceTargetProfile(guestCustomTargetSlug('x'), [...catalog], mine);
    expect(hit?.name).toBe('Custom');
  });
});
