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
import {
  parseGheFloraSnapshot,
  parseHydroBuddySaltsSnapshot,
} from './parse-manufacturer-snapshot.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HYDRO = path.join(ROOT, 'supabase/seed/nutrient/reference/hydroodo/hydroodo_db.json');
const MANIFEST = path.join(ROOT, 'supabase/seed/nutrient/manifest.json');
const CLASSICS = path.join(ROOT, 'supabase/seed/nutrient/classics.json');
const OVERDOSE = path.join(ROOT, 'supabase/seed/nutrient/reference/hydroodo/overdose.csv');
const OUT_BUNDLE = path.join(ROOT, 'supabase/seed/nutrient/adr014-catalog.bundle.json');
/** Generated delta SQL — copy into a new timestamped file under supabase/migrations/ (never edit applied migrations). */
const OUT_DELTA_SQL = path.join(ROOT, 'supabase/seed/nutrient/generated/adr014-catalog-sync.sql');
const GHE_FLORA_SNAPSHOT = path.join(
  ROOT,
  'supabase/seed/nutrient/manufacturers/ghe-flora-3part.snapshot.json',
);
const HB_SALTS_SNAPSHOT = path.join(
  ROOT,
  'supabase/seed/nutrient/manufacturers/hydrobuddy-salts.snapshot.json',
);

/** Fixed IDs aligned with supabase/migrations/20261022160000_adr014_p4_manufacturer_sources.sql */
const P4_TA_SOURCE_ID = '863eb08c-0bbe-43da-adfa-7549f78a5b94';
const P4_HB_SOURCE_ID = '69fd1994-9ce2-4805-a898-a1fef97d7236';
const P4_K2SO4_PRODUCT_ID = 'd6fa069e-5acd-4255-a499-51be7d21fa60';
const P4_GHE_SCHEDULE_ID = '6840975b-ce73-498b-a788-179c7db4bbdd';

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

function applyP4ManufacturerExtensions(bundle: CatalogBundle, hydroSourceId: string) {
  const ghe = parseGheFloraSnapshot(JSON.parse(readFileSync(GHE_FLORA_SNAPSHOT, 'utf8')));
  const hb = parseHydroBuddySaltsSnapshot(JSON.parse(readFileSync(HB_SALTS_SNAPSHOT, 'utf8')));

  const pushSource = (row: Record<string, unknown>) => {
    const slug = row.slug as string;
    if (!bundle.sources.some((s) => s.slug === slug)) bundle.sources.push(row);
  };

  pushSource({
    id: P4_TA_SOURCE_ID,
    slug: ghe.source.slug,
    name: ghe.source.name,
    citation: ghe.source.citation,
    url: ghe.source.url,
    license: ghe.source.license,
    retrieved_at: ghe.source.retrieved_at,
    verification_status: ghe.source.verification_status ?? 'spot_checked',
    trust_level: ghe.source.trust_level ?? 'high',
    notes: { provenance_class: ghe.source.provenance_class },
  });

  pushSource({
    id: P4_HB_SOURCE_ID,
    slug: hb.source.slug,
    name: hb.source.name,
    citation: hb.source.citation,
    url: hb.source.url,
    license: hb.source.license,
    retrieved_at: hb.source.retrieved_at,
    verification_status: hb.source.verification_status ?? 'spot_checked',
    trust_level: hb.source.trust_level ?? 'low',
    notes: { provenance_class: hb.source.provenance_class },
  });

  for (const link of ghe.product_label_links) {
    const product = bundle.fertilizers.find((p) => p.external_key === link.external_key);
    if (!product) continue;
    product.source_id = P4_TA_SOURCE_ID;
    product.trust_level = 'high';
    product.verification_status = 'spot_checked';
    product.retrieved_at = ghe.source.retrieved_at;
    product.metadata = {
      ...(product.metadata as Record<string, unknown>),
      provenance_class: link.provenance_class,
      label_url: link.label_url,
      manufacturer_source_slug: ghe.source.slug,
    };
  }

  for (const product of bundle.fertilizers) {
    if (product.source_id !== hydroSourceId) continue;
    const meta = (product.metadata as Record<string, unknown>) ?? {};
    if (meta.provenance_class) continue;
    product.metadata = { ...meta, provenance_class: 'hydroodo_legacy' };
  }

  for (const salt of hb.salts) {
    if (bundle.fertilizers.some((p) => p.external_key === salt.external_key)) continue;
    const solKey = inferSolubilityKeyFromDeclaredPct(salt.declared_pct, salt.external_key);
    const metadata: Record<string, unknown> = {
      provenance_class: 'community',
      citation: salt.citation,
    };
    if (solKey) metadata.solubility_key = solKey;
    bundle.fertilizers.push({
      id: P4_K2SO4_PRODUCT_ID,
      external_key: salt.external_key,
      brand: salt.brand,
      name: salt.name,
      physical_form: salt.physical_form,
      dose_unit: salt.dose_unit,
      source_id: P4_HB_SOURCE_ID,
      license: hb.source.license,
      retrieved_at: hb.source.retrieved_at,
      trust_level: hb.source.trust_level ?? 'low',
      verification_status: hb.source.verification_status ?? 'spot_checked',
      metadata,
      lines: Object.entries(salt.declared_pct).map(([form_key, value_pct]) => ({
        form_key,
        value_pct,
        source_id: P4_HB_SOURCE_ID,
        trust_level: hb.source.trust_level ?? 'low',
        license: hb.source.license,
        retrieved_at: hb.source.retrieved_at,
      })),
    });
  }

  const schedSlug = ghe.feed_schedule.slug;
  if (!bundle.feed_schedules.some((s) => s.slug === schedSlug)) {
    bundle.feed_schedules.push({
      id: P4_GHE_SCHEDULE_ID,
      slug: schedSlug,
      name: ghe.feed_schedule.name,
      manufacturer: ghe.feed_schedule.manufacturer,
      source_id: P4_TA_SOURCE_ID,
      trust_level: 'high',
      license: ghe.source.license,
      retrieved_at: ghe.source.retrieved_at,
      metadata: {
        provenance_class: 'manufacturer_feedchart',
        chart_url: ghe.source.url,
        steps: ghe.feed_schedule.steps,
      },
    });
  }

  bundle.counts.fertilizers = bundle.fertilizers.length;
}

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

  applyP4ManufacturerExtensions(bundle as CatalogBundle, hydroSourceId);

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
