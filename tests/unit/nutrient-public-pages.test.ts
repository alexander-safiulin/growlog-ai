import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('nutrient public pages static data', () => {
  it('bundle includes P4 sources and HydroBuddy product', () => {
    const bundle = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'),
        'utf8',
      ),
    );
    const slugs = bundle.sources.map((s: { slug: string }) => s.slug);
    expect(slugs).toContain('terra-aquatica-ghe-flora-feedchart');
    expect(slugs).toContain('hydrobuddy-salts-community');
    const k2 = bundle.fertilizers.find(
      (p: { external_key: string }) => p.external_key === 'hydrobuddy|k2so4',
    );
    expect(k2).toBeTruthy();
    expect(bundle.counts.fertilizers).toBe(126);
  });

  it('manifest lists imported and missing manufacturers', () => {
    const manifest = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'supabase/seed/nutrient/manufacturers/manifest-p4.json'),
        'utf8',
      ),
    );
    expect(manifest.imported.length).toBeGreaterThanOrEqual(3);
    expect(manifest.missing.map((m: { manufacturer: string }) => m.manufacturer)).toContain(
      'Advanced Nutrients',
    );
  });
});
