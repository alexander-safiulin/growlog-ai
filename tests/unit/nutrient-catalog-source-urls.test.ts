import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectCatalogSourceUrls } from '../../scripts/nutrient-import/list-catalog-source-urls.ts';

const FORBIDDEN_SUBSTRINGS = [
  'saltonverde.com/wp-content/uploads/2015/etiqueta_',
  'statistics.php',
  '\\/',
  'htgsupply.com/wp-content/uploads',
  'growmart.eu/Canna-',
  'canna-uk.com/canna-boost',
  'canna-uk.com/canna-pk-13-14',
];

describe('catalog source URLs', () => {
  it('lists all HTTP refs without escaped or scraped junk URLs', () => {
    const bundle = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json'),
        'utf8',
      ),
    );
    const refs = collectCatalogSourceUrls(bundle);
    expect(refs.length).toBeGreaterThan(20);
    for (const r of refs) {
      expect(r.url).toMatch(/^https?:\/\//);
      for (const bad of FORBIDDEN_SUBSTRINGS) {
        expect(r.url).not.toContain(bad);
      }
    }
    const urls = [...new Set(refs.map((x) => x.url))];
    expect(urls).not.toContain('https://www.canna-uk.com/canna-pk-13-14');
    expect(urls).not.toContain('https://www.growmart.eu/Canna-Coco-A-B');
  });
});
