/**
 * Build ADR-014 catalog bundle + idempotent seed SQL (no DB connection).
 * Run: pnpm nutrient:build-catalog
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardPpmFromCatalogRecipeLines } from '../../packages/nutrient-calc/src/catalog-db.ts';
import { CANONICAL_NA2O_FACTOR } from '../../packages/nutrient-calc/src/oxide.ts';
import {
  hydroodoSystemSlug,
  normalizeHydroodoComponents,
  type HydroComponent,
} from './hydroodo-normalize.ts';
import { inferSolubilityKeyFromDeclaredPct } from '../../packages/nutrient-calc/src/solubility-key.ts';
import { mergeP4IntoBundle } from './p4-manufacturer-import.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HYDRO = path.join(ROOT, 'supabase/seed/nutrient/reference/hydroodo/hydroodo_db.json');
const MANIFEST = path.join(ROOT, 'supabase/seed/nutrient/manifest.json');
const CLASSICS = path.join(ROOT, 'supabase/seed/nutrient/classics.json');
const OVERDOSE = path.join(ROOT, 'supabase/seed/nutrient/reference/hydroodo/overdose.csv');
const OUT_BUNDLE = path.join(ROOT, 'supabase/seed/nutrient/adr014-catalog.bundle.json');
/** Generated delta SQL — copy into a new timestamped file under supabase/migrations/ (never edit applied migrations). */
const OUT_DELTA_SQL = path.join(ROOT, 'supabase/seed/nutrient/generated/adr014-catalog-sync.sql');
const RETRIEVED = '2026-10-21T00:00:00Z';
const HYDRO_SLUG = 'hydroodo-0.4b18';
const SCI_SLUG = 'growlog-scientific-canonical';

type NormalizedProduct = {
  external_key: string;
  metadata: Record<string, unknown>;
  declared_pct: Record<string, number>;
};

function attachSolubilityMetadata<T extends NormalizedProduct>(product: T): T {
  const key = inferSolubilityKeyFromDeclaredPct(product.declared_pct, product.external_key);
  if (!key) return product;
  return {
    ...product,
    metadata: { ...product.metadata, solubility_key: key },
  };
}

function externalKey(brand: string, name: string): string {
  return `${brand.trim()}|${name.trim()}`.toLowerCase();
}

function sqlStr(s: string | null | undefined): string {
  if (s == null) return 'null';
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlJson(obj: unknown): string {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function stableUuid(seed: string): string {
  const h = createHash('sha256').update(`growlog-nutrient-v1:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

interface HydroDb {
  elements: Array<{ name: string; desc?: string; factor_to_element: number; group: string }>;
  components: HydroComponent[];
  systems: Array<{ name: string; ppm: Record<string, number> }>;
}

function parseOverdoseCsv(text: string): Record<string, number> {
  const lines = text.trim().split('\n').slice(1);
  const out: Record<string, number> = {};
  for (const line of lines) {
    const [group, pct] = line.split(',');
    if (group && pct) out[group.trim()] = Number(pct);
  }
  return out;
}

type CatalogBundle = {
  version: number;
  generated_at: string;
  counts: Record<string, number>;
  sources: Array<Record<string, unknown>>;
  fertilizers: Array<Record<string, unknown>>;
  feed_schedules: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

function main() {
  const hydro = JSON.parse(readFileSync(HYDRO, 'utf8')) as HydroDb;
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const classics = JSON.parse(readFileSync(CLASSICS, 'utf8'));
  const overdose = parseOverdoseCsv(readFileSync(OVERDOSE, 'utf8'));

  const { products: normalizedProducts, aliases } = normalizeHydroodoComponents(hydro.components);

  const hydroSourceId = stableUuid(`source:${HYDRO_SLUG}`);
  const sciSourceId = stableUuid(`source:${SCI_SLUG}`);
  const allFertilizers = normalizedProducts.map((p) => attachSolubilityMetadata(p));

  const hydroProfiles = hydro.systems.map((s, index) => {
    const slug = hydroodoSystemSlug(s.name, index);
    return {
      id: stableUuid(`profile:hydro:${slug}`),
      slug,
      name: s.name,
      stage: 'hydroodo_system',
      target_ppm: s.ppm,
      overdose_pct: overdose,
      source_id: hydroSourceId,
      trust_level: 'medium',
      verification_status: 'unverified',
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
    };
  });

  const classicProfiles = classics.profiles.map(
    (p: {
      slug: string;
      name: string;
      stage: string;
      citation: string;
      url: string;
      target_ppm: Record<string, number>;
    }) => ({
      id: stableUuid(`profile:classic:${p.slug}`),
      slug: p.slug,
      name: p.name,
      stage: p.stage,
      target_ppm: p.target_ppm,
      overdose_pct: overdose,
      source_id: sciSourceId,
      citation: p.citation,
      url: p.url,
      trust_level: 'high',
      verification_status: 'spot_checked',
      license: 'CC-BY-SA-4.0 (Growlog compilation)',
      retrieved_at: RETRIEVED,
    }),
  );

  const catalogRecipes = (classics.catalog_recipes ?? []).map(
    (r: {
      slug: string;
      profile_slug: string;
      name: string;
      citation: string;
      lines: Array<{
        ingredient_label: string;
        dose_per_l: number;
        declared_pct: Record<string, number>;
      }>;
    }) => {
      const publishedPpm = forwardPpmFromCatalogRecipeLines(r.lines, 'canonical');
      const profileTarget = classics.profiles.find(
        (p: { slug: string }) => p.slug === r.profile_slug,
      )?.target_ppm;
      return {
      id: stableUuid(`catalog-recipe:${r.slug}`),
      slug: r.slug,
      profile_slug: r.profile_slug,
      name: r.name,
      citation: r.citation,
      source_id: sciSourceId,
      trust_level: 'high',
      verification_status: 'spot_checked',
      license: 'CC-BY-SA-4.0 (Growlog compilation)',
      retrieved_at: RETRIEVED,
      metadata: {
        published_ppm_macros: publishedPpm,
        profile_target_ppm: profileTarget,
      },
      lines: r.lines.filter((line) => line.dose_per_l > 0).map((line, i) => ({
        line_order: i + 1,
        ingredient_label: line.ingredient_label,
        dose_per_l: line.dose_per_l,
        unit: 'g_per_L',
        declared_pct: line.declared_pct,
        source_id: sciSourceId,
        trust_level: 'high',
        license: 'CC-BY-SA-4.0 (Growlog compilation)',
        retrieved_at: RETRIEVED,
      })),
    };
    },
  );

  const bundle = {
    version: 2,
    generated_at: new Date().toISOString(),
    counts: {
      fertilizers: normalizedProducts.length,
      fertilizer_aliases: aliases.length,
      hydro_systems: hydro.systems.length,
      target_profiles: hydroProfiles.length + classicProfiles.length,
      catalog_recipes: catalogRecipes.length,
      elements: hydro.elements.length,
      classics: classics.profiles.length,
    },
    sources: [
      {
        id: hydroSourceId,
        slug: HYDRO_SLUG,
        name: manifest.name,
        citation: manifest.citation,
        url: manifest.url,
        license: manifest.license,
        retrieved_at: manifest.retrieved_at ?? RETRIEVED,
        verification_status: manifest.verification_status ?? 'unverified',
        trust_level: manifest.confidence === 'medium' ? 'medium' : 'unverified',
      },
      {
        id: sciSourceId,
        slug: SCI_SLUG,
        name: 'Growlog scientific canonical references',
        citation: 'Molar-mass oxide factors and open literature recipes',
        license: 'CC-BY-SA-4.0 (Growlog compilation)',
        retrieved_at: RETRIEVED,
        verification_status: 'spot_checked',
        trust_level: 'high',
      },
    ],
    elements: hydro.elements.map((el) => ({
      id: stableUuid(`element:${el.name}`),
      symbol: el.name,
      display_name: el.desc ?? el.name,
      element_group: el.group,
      default_overdose_pct: overdose[el.group] ?? overdose[el.name] ?? 50,
      source_id: hydroSourceId,
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
      trust_level: 'medium',
      metadata: { factor_to_element: el.factor_to_element },
    })),
    oxide_factors: [
      {
        form_key: 'Na2O',
        element_symbol: 'Na',
        factor: CANONICAL_NA2O_FACTOR,
        source_id: sciSourceId,
        trust_level: 'high',
        verification_status: 'spot_checked',
        notes: 'Canonical molar-mass factor',
      },
      {
        form_key: 'Na2O',
        element_symbol: 'Na',
        factor: 0.56,
        source_id: hydroSourceId,
        trust_level: 'low',
        verification_status: 'known_error',
        notes: 'Hydroodo legacy erroneous factor (document only)',
      },
    ],
    fertilizers: allFertilizers.map((c) => ({
      id: stableUuid(`product:${c.external_key}`),
      external_key: c.external_key,
      brand: c.brand,
      name: c.name,
      physical_form: c.brand.includes('USA') || c.brand.includes('France') ? 'liquid' : 'solid',
      dose_unit: c.brand.includes('USA') || c.brand.includes('France') ? 'ml_per_L' : 'g_per_L',
      source_id: hydroSourceId,
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
      trust_level: 'medium',
      verification_status: 'unverified',
      metadata: c.metadata,
      lines: Object.entries(c.declared_pct)
        .filter(([, v]) => v != null && v !== 0)
        .map(([form_key, value_pct]) => ({
          form_key,
          value_pct,
          source_id: hydroSourceId,
          trust_level: 'medium',
          license: manifest.license,
          retrieved_at: manifest.retrieved_at ?? RETRIEVED,
        })),
    })),
    fertilizer_aliases: aliases.map((a) => ({
      ...a,
      source_id: hydroSourceId,
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
      trust_level: 'medium',
    })),
    target_profiles: [...hydroProfiles, ...classicProfiles],
    feed_schedules: hydroProfiles.map((p) => ({
      id: stableUuid(`schedule:${p.slug}`),
      slug: p.slug,
      name: p.name,
      manufacturer: 'Hydroodo',
      profile_slug: p.slug,
      source_id: hydroSourceId,
      trust_level: 'medium',
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
    })),
    catalog_recipes: catalogRecipes,
  };

  mergeP4IntoBundle(bundle as CatalogBundle, hydroSourceId);

  mkdirSync(path.dirname(OUT_BUNDLE), { recursive: true });
  writeFileSync(OUT_BUNDLE, JSON.stringify(bundle, null, 2));

  const deltaSql: string[] = [
    '-- Generated by pnpm nutrient:build-catalog',
    '-- Copy into a NEW supabase/migrations/<timestamp>_adr014_*.sql file.',
    '-- Never modify migrations that are already applied in production.',
    '',
  ];

  for (const p of bundle.fertilizers) {
    const solKey = (p.metadata as { solubility_key?: string })?.solubility_key;
    if (!solKey) continue;
    deltaSql.push(`update public.fertilizer_products
set metadata = coalesce(metadata, '{}'::jsonb) || ${sqlJson({ solubility_key: solKey })},
    updated_at = now()
where external_key = ${sqlStr(p.external_key)};`);
  }

  for (const recipe of bundle.catalog_recipes) {
    const meta = (recipe as { metadata?: unknown }).metadata ?? {};
    deltaSql.push(`update public.nutrient_catalog_recipes
set metadata = ${sqlJson(meta)},
    updated_at = now()
where slug = ${sqlStr(recipe.slug)};`);
  }

  mkdirSync(path.dirname(OUT_DELTA_SQL), { recursive: true });
  writeFileSync(OUT_DELTA_SQL, deltaSql.join('\n\n') + '\n');

  console.log(`Wrote ${OUT_BUNDLE}`);
  console.log(
    `Wrote ${OUT_DELTA_SQL} (delta sync for ${bundle.fertilizers.length} fertilizers, ${bundle.catalog_recipes.length} catalog recipes)`,
  );
}

main();
