import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('nutrient public pages static data', () => {
  it('bundle includes P4 sources and HydroBuddy salts', () => {
    const bundle = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'),
        'utf8',
      ),
    );
    const slugs = bundle.sources.map((s: { slug: string }) => s.slug);
    expect(slugs).toContain('terra-aquatica-tripart-official');
    expect(slugs).toContain('hydrobuddy-salts-community');
    expect(slugs).toContain('plagron-official-tds');
    const kno3 = bundle.fertilizers.find(
      (p: { external_key: string }) => p.external_key === 'hydrobuddy|kno3',
    );
    expect(kno3).toBeTruthy();
    expect(bundle.counts.fertilizers).toBe(182);
  });

  it('manifest lists imported manufacturers', () => {
    const manifest = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'supabase/seed/nutrient/manufacturers/manifest-p4.json'),
        'utf8',
      ),
    );
    expect(manifest.imported.length).toBeGreaterThanOrEqual(5);
  });
});
