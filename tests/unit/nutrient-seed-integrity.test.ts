import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const bundlePath = path.join(
  process.cwd(),
  'supabase/seed/nutrient/adr014-catalog.bundle.json',
);

describe('ADR-014 catalog bundle integrity', () => {
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

  it('has expected Hydroodo counts', () => {
    expect(bundle.counts.fertilizers).toBe(127);
    expect(bundle.counts.hydro_systems).toBe(21);
    expect(bundle.counts.elements).toBe(38);
    expect(bundle.counts.classics).toBe(4);
    expect(bundle.target_profiles.length).toBe(25);
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

  it('classic profiles have citations', () => {
    const classics = bundle.target_profiles.filter((p: { slug: string }) =>
      ['hoagland-standard', 'long-ashton', 'cornell-lettuce', 'ufl-hs796-tomato-vegetative'].includes(
        p.slug,
      ),
    );
    expect(classics).toHaveLength(4);
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
