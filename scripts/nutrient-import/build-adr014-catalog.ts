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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HYDRO = path.join(ROOT, 'supabase/seed/nutrient/reference/hydroodo/hydroodo_db.json');
const MANIFEST = path.join(ROOT, 'supabase/seed/nutrient/manifest.json');
const CLASSICS = path.join(ROOT, 'supabase/seed/nutrient/classics.json');
const OVERDOSE = path.join(ROOT, 'supabase/seed/nutrient/reference/hydroodo/overdose.csv');
const OUT_BUNDLE = path.join(ROOT, 'supabase/seed/nutrient/adr014-catalog.bundle.json');
const OUT_SQL = path.join(ROOT, 'supabase/migrations/20261021120100_adr014_nutrient_seed.sql');

const RETRIEVED = '2026-10-21T00:00:00Z';
const HYDRO_SLUG = 'hydroodo-0.4b18';
const SCI_SLUG = 'growlog-scientific-canonical';

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

function main() {
  const hydro = JSON.parse(readFileSync(HYDRO, 'utf8')) as HydroDb;
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const classics = JSON.parse(readFileSync(CLASSICS, 'utf8'));
  const overdose = parseOverdoseCsv(readFileSync(OVERDOSE, 'utf8'));

  const { products: normalizedProducts, aliases } = normalizeHydroodoComponents(hydro.components);

  const hydroSourceId = stableUuid(`source:${HYDRO_SLUG}`);
  const sciSourceId = stableUuid(`source:${SCI_SLUG}`);

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
      lines: r.lines.map((line, i) => ({
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
    fertilizers: normalizedProducts.map((c) => ({
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

  mkdirSync(path.dirname(OUT_BUNDLE), { recursive: true });
  writeFileSync(OUT_BUNDLE, JSON.stringify(bundle, null, 2));

  const sql: string[] = [
    '-- ADR-014 seed (idempotent). Generated by scripts/nutrient-import/build-adr014-catalog.ts',
    '-- DO NOT edit by hand; re-run the script after changing hydroodo/classics sources.',
    '',
  ];

  for (const src of bundle.sources) {
    sql.push(`insert into public.nutrient_data_sources (
  id, slug, name, source_type, citation, url, license, retrieved_at, verification_status, trust_level
) values (
  ${sqlStr(src.id)}::uuid, ${sqlStr(src.slug)}, ${sqlStr(src.name)}, 'reference',
  ${sqlStr(src.citation)}, ${sqlStr(src.url)}, ${sqlStr(src.license)},
  ${sqlStr(src.retrieved_at)}::timestamptz, ${sqlStr(src.verification_status)}::public.nutrient_verification_status,
  ${sqlStr(src.trust_level)}::public.nutrient_trust_level
) on conflict (slug) do update set
  name = excluded.name, citation = excluded.citation, url = excluded.url, license = excluded.license,
  retrieved_at = excluded.retrieved_at, verification_status = excluded.verification_status,
  trust_level = excluded.trust_level, updated_at = now();`);
  }

  for (const el of bundle.elements) {
    sql.push(`insert into public.nutrient_elements (
  id, symbol, display_name, element_group, default_overdose_pct, source_id, license, retrieved_at, trust_level, verification_status, metadata
) values (
  ${sqlStr(el.id)}::uuid, ${sqlStr(el.symbol)}, ${sqlStr(el.display_name)}, ${sqlStr(el.element_group)},
  ${el.default_overdose_pct}, ${sqlStr(el.source_id)}::uuid, ${sqlStr(el.license)},
  ${sqlStr(el.retrieved_at)}::timestamptz, ${sqlStr(el.trust_level)}::public.nutrient_trust_level,
  'unverified'::public.nutrient_verification_status, ${sqlJson(el.metadata)}
) on conflict (symbol) do update set
  display_name = excluded.display_name, element_group = excluded.element_group,
  default_overdose_pct = excluded.default_overdose_pct, source_id = excluded.source_id,
  license = excluded.license, retrieved_at = excluded.retrieved_at, trust_level = excluded.trust_level,
  metadata = excluded.metadata, updated_at = now();`);
  }

  for (const ox of bundle.oxide_factors) {
    sql.push(`insert into public.nutrient_oxide_factors (
  form_key, element_symbol, factor, source_id, license, retrieved_at, trust_level, verification_status, notes
) values (
  ${sqlStr(ox.form_key)}, ${sqlStr(ox.element_symbol)}, ${ox.factor}, ${sqlStr(ox.source_id)}::uuid,
  ${sqlStr(manifest.license)}, ${sqlStr(RETRIEVED)}::timestamptz,
  ${sqlStr(ox.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(ox.verification_status)}::public.nutrient_verification_status, ${sqlStr(ox.notes)}
) on conflict (form_key, element_symbol, source_id) do update set
  factor = excluded.factor, trust_level = excluded.trust_level,
  verification_status = excluded.verification_status, notes = excluded.notes, updated_at = now();`);
  }

  for (const p of bundle.fertilizers) {
    sql.push(`insert into public.fertilizer_products (
  id, external_key, brand, name, physical_form, dose_unit, is_custom, source_id, license, retrieved_at, trust_level, verification_status, metadata
) values (
  ${sqlStr(p.id)}::uuid, ${sqlStr(p.external_key)}, ${sqlStr(p.brand)}, ${sqlStr(p.name)},
  ${sqlStr(p.physical_form)}::public.nutrient_physical_form, ${sqlStr(p.dose_unit)}::public.nutrient_dose_unit,
  false, ${sqlStr(p.source_id)}::uuid, ${sqlStr(p.license)}, ${sqlStr(p.retrieved_at)}::timestamptz,
  ${sqlStr(p.trust_level)}::public.nutrient_trust_level, ${sqlStr(p.verification_status)}::public.nutrient_verification_status,
  ${sqlJson(p.metadata ?? {})}
) on conflict (external_key) do update set
  brand = excluded.brand, name = excluded.name, physical_form = excluded.physical_form,
  dose_unit = excluded.dose_unit, source_id = excluded.source_id, license = excluded.license,
  retrieved_at = excluded.retrieved_at, trust_level = excluded.trust_level,
  verification_status = excluded.verification_status, metadata = excluded.metadata, updated_at = now();`);
    for (const line of p.lines) {
      sql.push(`insert into public.fertilizer_composition_lines (
  product_id, form_key, value_pct, source_id, license, retrieved_at, trust_level, verification_status
) values (
  (select id from public.fertilizer_products where external_key = ${sqlStr(p.external_key)}),
  ${sqlStr(line.form_key)}, ${line.value_pct}, ${sqlStr(line.source_id)}::uuid,
  ${sqlStr(line.license)}, ${sqlStr(line.retrieved_at)}::timestamptz,
  ${sqlStr(line.trust_level)}::public.nutrient_trust_level, 'unverified'::public.nutrient_verification_status
) on conflict (product_id, form_key) do update set
  value_pct = excluded.value_pct, source_id = excluded.source_id, license = excluded.license,
  retrieved_at = excluded.retrieved_at, trust_level = excluded.trust_level, updated_at = now();`);
    }
  }

  for (const alias of bundle.fertilizer_aliases) {
    sql.push(`insert into public.fertilizer_product_aliases (
  alias_external_key, canonical_external_key, source_id, license, retrieved_at, trust_level, notes
) values (
  ${sqlStr(alias.alias_external_key)}, ${sqlStr(alias.canonical_external_key)},
  ${sqlStr(alias.source_id)}::uuid, ${sqlStr(alias.license)}, ${sqlStr(alias.retrieved_at)}::timestamptz,
  ${sqlStr(alias.trust_level)}::public.nutrient_trust_level, ${sqlJson(alias.notes ?? {})}
) on conflict (alias_external_key) do update set
  canonical_external_key = excluded.canonical_external_key, notes = excluded.notes, updated_at = now();`);
  }

  for (const prof of bundle.target_profiles) {
    sql.push(`insert into public.target_solution_profiles (
  id, slug, name, stage, target_ppm, overdose_pct, source_id, citation, url, license, retrieved_at, trust_level, verification_status
) values (
  ${sqlStr(prof.id)}::uuid, ${sqlStr(prof.slug)}, ${sqlStr(prof.name)}, ${sqlStr(prof.stage)},
  ${sqlJson(prof.target_ppm)}, ${sqlJson(prof.overdose_pct)}, ${sqlStr(prof.source_id)}::uuid,
  ${sqlStr((prof as { citation?: string }).citation ?? null)}, ${sqlStr((prof as { url?: string }).url ?? null)},
  ${sqlStr(prof.license)}, ${sqlStr(prof.retrieved_at)}::timestamptz,
  ${sqlStr(prof.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(prof.verification_status)}::public.nutrient_verification_status
) on conflict (slug) do update set
  name = excluded.name, stage = excluded.stage, target_ppm = excluded.target_ppm,
  overdose_pct = excluded.overdose_pct, source_id = excluded.source_id, citation = excluded.citation,
  url = excluded.url, license = excluded.license, retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level, verification_status = excluded.verification_status, updated_at = now();`);
  }

  for (const sched of bundle.feed_schedules) {
    sql.push(`insert into public.feed_schedules (
  id, slug, name, manufacturer, profile_id, source_id, license, retrieved_at, trust_level, verification_status
) values (
  ${sqlStr(sched.id)}::uuid, ${sqlStr(sched.slug)}, ${sqlStr(sched.name)}, ${sqlStr(sched.manufacturer)},
  (select id from public.target_solution_profiles where slug = ${sqlStr(sched.profile_slug)}),
  ${sqlStr(sched.source_id)}::uuid, ${sqlStr(sched.license)}, ${sqlStr(sched.retrieved_at)}::timestamptz,
  ${sqlStr(sched.trust_level)}::public.nutrient_trust_level, 'unverified'::public.nutrient_verification_status
) on conflict (slug) do update set
  name = excluded.name, manufacturer = excluded.manufacturer, profile_id = excluded.profile_id,
  source_id = excluded.source_id, license = excluded.license, retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level, updated_at = now();`);
  }

  for (const recipe of bundle.catalog_recipes) {
    sql.push(`insert into public.nutrient_catalog_recipes (
  id, slug, name, profile_slug, target_profile_id, citation, source_id, license, retrieved_at, trust_level, verification_status, metadata
) values (
  ${sqlStr(recipe.id)}::uuid, ${sqlStr(recipe.slug)}, ${sqlStr(recipe.name)}, ${sqlStr(recipe.profile_slug)},
  (select id from public.target_solution_profiles where slug = ${sqlStr(recipe.profile_slug)}),
  ${sqlStr(recipe.citation)}, ${sqlStr(recipe.source_id)}::uuid, ${sqlStr(recipe.license)},
  ${sqlStr(recipe.retrieved_at)}::timestamptz, ${sqlStr(recipe.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(recipe.verification_status)}::public.nutrient_verification_status, ${sqlJson((recipe as { metadata?: unknown }).metadata ?? {})}
) on conflict (slug) do update set
  name = excluded.name, profile_slug = excluded.profile_slug, target_profile_id = excluded.target_profile_id,
  citation = excluded.citation, license = excluded.license, retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level, verification_status = excluded.verification_status,
  metadata = excluded.metadata, updated_at = now();`);
    for (const line of recipe.lines) {
      sql.push(`insert into public.nutrient_catalog_recipe_lines (
  recipe_id, line_order, ingredient_label, dose_per_l, unit, declared_pct, source_id, license, retrieved_at, trust_level
) values (
  (select id from public.nutrient_catalog_recipes where slug = ${sqlStr(recipe.slug)}),
  ${line.line_order}, ${sqlStr(line.ingredient_label)}, ${line.dose_per_l},
  ${sqlStr(line.unit)}::public.nutrient_dose_unit, ${sqlJson(line.declared_pct)},
  ${sqlStr(line.source_id)}::uuid, ${sqlStr(line.license)}, ${sqlStr(line.retrieved_at)}::timestamptz,
  ${sqlStr(line.trust_level)}::public.nutrient_trust_level
) on conflict (recipe_id, line_order) do update set
  ingredient_label = excluded.ingredient_label, dose_per_l = excluded.dose_per_l,
  declared_pct = excluded.declared_pct, updated_at = now();`);
    }
  }

  writeFileSync(OUT_SQL, sql.join('\n\n') + '\n');
  console.log(`Wrote ${OUT_BUNDLE}`);
  console.log(
    `Wrote ${OUT_SQL} (${bundle.fertilizers.length} fertilizers, ${bundle.fertilizer_aliases.length} aliases, ${bundle.target_profiles.length} profiles, ${bundle.catalog_recipes.length} catalog recipes)`,
  );
}

main();
