/**
 * List HTTP source URLs referenced in the ADR-014 catalog bundle (for curl / CI checks).
 * Run: pnpm nutrient:list-source-urls
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCatalogSourceUrl } from './p4-manufacturer-import.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLE = path.join(ROOT, 'supabase/seed/nutrient/adr014-catalog.bundle.json');

export type CatalogUrlRef = {
  url: string;
  kind: 'metadata.source_url' | 'metadata.chart_url' | 'source.url' | 'profile.url';
  context: string;
};

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export function collectCatalogSourceUrls(bundle: {
  sources?: Array<{ slug?: string; url?: string }>;
  fertilizers?: Array<{ external_key?: string; metadata?: Record<string, unknown> }>;
  feed_schedules?: Array<{ slug?: string; metadata?: Record<string, unknown> }>;
  target_profiles?: Array<{ slug?: string; url?: string; metadata?: Record<string, unknown> }>;
}): CatalogUrlRef[] {
  const out: CatalogUrlRef[] = [];

  for (const s of bundle.sources ?? []) {
    const url = normalizeCatalogSourceUrl(s.url);
    if (url) out.push({ url, kind: 'source.url', context: `source:${s.slug ?? 'unknown'}` });
  }

  for (const f of bundle.fertilizers ?? []) {
    const meta = (f.metadata ?? {}) as Record<string, unknown>;
    const url = normalizeCatalogSourceUrl(String(meta.source_url ?? ''));
    if (url) {
      out.push({
        url,
        kind: 'metadata.source_url',
        context: f.external_key ?? 'fertilizer',
      });
    }
  }

  for (const sched of bundle.feed_schedules ?? []) {
    const meta = (sched.metadata ?? {}) as Record<string, unknown>;
    const chart = normalizeCatalogSourceUrl(String(meta.chart_url ?? ''));
    if (chart) {
      out.push({ url: chart, kind: 'metadata.chart_url', context: `schedule:${sched.slug}` });
    }
  }

  for (const p of bundle.target_profiles ?? []) {
    const url = normalizeCatalogSourceUrl(String(p.url ?? ''));
    if (url) out.push({ url, kind: 'profile.url', context: `profile:${p.slug}` });
  }

  const seen = new Set<string>();
  return out.filter((r) => {
    const key = `${r.kind}\0${r.url}\0${r.context}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return isHttpUrl(r.url);
  });
}

function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8'));
  const refs = collectCatalogSourceUrls(bundle);
  for (const r of refs) {
    console.log(`${r.url}\t${r.kind}\t${r.context}`);
  }
  console.error(`# ${refs.length} URL refs (unique url+kind+context)`);
}

if (process.argv[1]?.endsWith('list-catalog-source-urls.ts')) {
  main();
}
