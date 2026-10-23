import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildP5ImportModel } from '../../scripts/nutrient-import/p5-manufacturer-import.ts';

describe('liquid fertilizer density metadata (P5 manufacturer import)', () => {
  const bundle = JSON.parse(
    readFileSync(path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'), 'utf8'),
  );
  const p5 = buildP5ImportModel();
  const keys = new Set([
    ...p5.newProducts.map((p) => p.external_key),
    ...p5.productPatches.map((p) => p.external_key),
  ]);

  it('every P5 liquid has density_g_ml or density_unknown (or is feed-only)', () => {
    for (const key of keys) {
      const p = bundle.fertilizers.find((f: { external_key: string }) => f.external_key === key);
      if (!p || p.physical_form !== 'liquid') continue;
      const meta = p.metadata as Record<string, unknown>;
      if (meta.feed_only) continue;
      const hasDensity = typeof meta.density_g_ml === 'number' && meta.density_g_ml > 0;
      const flagged = meta.density_unknown === true;
      expect(hasDensity || flagged, key).toBe(true);
    }
  });
});
