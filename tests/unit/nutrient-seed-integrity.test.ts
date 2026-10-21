import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const bundlePath = path.join(
  process.cwd(),
  'supabase/seed/nutrient/adr014-catalog.bundle.json',
);

describe('ADR-014 catalog bundle integrity', () => {
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

  it('has expected Hydroodo counts after dedupe', () => {
    expect(bundle.counts.fertilizers).toBe(125);
    expect(bundle.counts.fertilizer_aliases).toBe(2);
    expect(bundle.counts.hydro_systems).toBe(21);
    expect(bundle.counts.classics).toBe(8);
    expect(bundle.counts.catalog_recipes).toBe(2);
    expect(bundle.target_profiles.length).toBe(29);
    expect(bundle.feed_schedules.length).toBe(21);
  });

  it('hydroodo system slugs are unique', () => {
    const slugs = bundle.target_profiles
      .filter((p: { stage: string }) => p.stage === 'hydroodo_system')
      .map((p: { slug: string }) => p.slug);
    expect(new Set(slugs).size).toBe(21);
  });

  it('every fertilizer has composition lines and provenance', () => {
    const sourceIds = new Set(bundle.sources.map((s: { id: string }) => s.id));
    for (const p of bundle.fertilizers) {
      expect(p.external_key).toMatch(/\|/);
      expect(sourceIds.has(p.source_id)).toBe(true);
      expect(p.lines.length).toBeGreaterThan(0);
      expect(p.trust_level).toBeTruthy();
      expect(p.retrieved_at).toBeTruthy();
    }
  });

  it('includes canonical Na2O factor and Hydroodo legacy error row', () => {
    const canonical = bundle.oxide_factors.find(
      (o: { factor: number; verification_status: string }) =>
        o.factor > 0.74 && o.verification_status === 'spot_checked',
    );
    const legacy = bundle.oxide_factors.find(
      (o: { factor: number }) => Math.abs(o.factor - 0.56) < 1e-6,
    );
    expect(canonical).toBeDefined();
    expect(legacy?.verification_status).toBe('known_error');
  });

  it('classic profiles and catalog recipes present', () => {
    const classicSlugs = [
      'hoagland-standard',
      'long-ashton',
      'cornell-lettuce',
      'ufl-cv216-tomato-stage-1',
      'ufl-cv216-tomato-stage-2',
      'ufl-cv216-tomato-stage-3',
      'ufl-cv216-tomato-stage-4',
      'ufl-cv216-tomato-stage-5',
    ];
    const classics = bundle.target_profiles.filter((p: { slug: string }) =>
      classicSlugs.includes(p.slug),
    );
    expect(classics).toHaveLength(8);
    expect(bundle.catalog_recipes).toHaveLength(2);
    for (const c of classics) {
      expect(c.citation).toBeTruthy();
      expect(c.trust_level).toBe('high');
    }
  });

  it('keeps GHE France and USA as distinct products', () => {
    const ghe = bundle.fertilizers.filter((p: { brand: string }) =>
      p.brand.includes('GHE (General Hydroponics)'),
    );
    const brands = new Set(ghe.map((p: { brand: string }) => p.brand));
    expect(brands.has('GHE (General Hydroponics) France')).toBe(true);
    expect(brands.has('GHE (General Hydroponics) Original USA')).toBe(true);
  });
});
