/**
 * Build ADR-014 catalog bundle + idempotent seed SQL (no DB connection).
 * Run: pnpm exec tsx scripts/nutrient-import/build-adr014-catalog.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_NA2O_FACTOR } from '../../packages/nutrient-calc/src/oxide.ts';

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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
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
  components: Array<{
    brand: string;
    name: string;
    declared_pct: Record<string, number>;
  }>;
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

  const fertilizers = hydro.components;

  const hydroSourceId = stableUuid(`source:${HYDRO_SLUG}`);
  const sciSourceId = stableUuid(`source:${SCI_SLUG}`);

  const bundle = {
    version: 1,
    generated_at: new Date().toISOString(),
    counts: {
      fertilizers: fertilizers.length,
      hydro_systems: hydro.systems.length,
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
    fertilizers: fertilizers.map((c) => ({
      id: stableUuid(`product:${externalKey(c.brand, c.name)}`),
      external_key: externalKey(c.brand, c.name),
      brand: c.brand,
      name: c.name,
      physical_form: c.brand.includes('USA') || c.brand.includes('France') ? 'liquid' : 'solid',
      dose_unit: c.brand.includes('USA') || c.brand.includes('France') ? 'ml_per_L' : 'g_per_L',
      source_id: hydroSourceId,
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
      trust_level: 'medium',
      verification_status: 'unverified',
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
    target_profiles: [
      ...hydro.systems.map((s) => ({
        id: stableUuid(`profile:hydro:${slugify(s.name)}`),
        slug: `hydroodo-${slugify(s.name)}`,
        name: s.name,
        stage: 'hydroodo_system',
        target_ppm: s.ppm,
        overdose_pct: overdose,
        source_id: hydroSourceId,
        trust_level: 'medium',
        verification_status: 'unverified',
        license: manifest.license,
        retrieved_at: manifest.retrieved_at ?? RETRIEVED,
      })),
      ...classics.profiles.map((p: {
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
      })),
    ],
    feed_schedules: hydro.systems.map((s) => ({
      id: stableUuid(`schedule:${slugify(s.name)}`),
      slug: `hydroodo-${slugify(s.name)}`,
      name: s.name,
      manufacturer: 'Hydroodo',
      profile_slug: `hydroodo-${slugify(s.name)}`,
      source_id: hydroSourceId,
      trust_level: 'medium',
      license: manifest.license,
      retrieved_at: manifest.retrieved_at ?? RETRIEVED,
    })),
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
  id, external_key, brand, name, physical_form, dose_unit, is_custom, source_id, license, retrieved_at, trust_level, verification_status
) values (
  ${sqlStr(p.id)}::uuid, ${sqlStr(p.external_key)}, ${sqlStr(p.brand)}, ${sqlStr(p.name)},
  ${sqlStr(p.physical_form)}::public.nutrient_physical_form, ${sqlStr(p.dose_unit)}::public.nutrient_dose_unit,
  false, ${sqlStr(p.source_id)}::uuid, ${sqlStr(p.license)}, ${sqlStr(p.retrieved_at)}::timestamptz,
  ${sqlStr(p.trust_level)}::public.nutrient_trust_level, ${sqlStr(p.verification_status)}::public.nutrient_verification_status
) on conflict (external_key) do update set
  brand = excluded.brand, name = excluded.name, physical_form = excluded.physical_form,
  dose_unit = excluded.dose_unit, source_id = excluded.source_id, license = excluded.license,
  retrieved_at = excluded.retrieved_at, trust_level = excluded.trust_level,
  verification_status = excluded.verification_status, updated_at = now();`);
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

  writeFileSync(OUT_SQL, sql.join('\n\n') + '\n');
  console.log(`Wrote ${OUT_BUNDLE}`);
  console.log(`Wrote ${OUT_SQL} (${bundle.fertilizers.length} fertilizers, ${bundle.target_profiles.length} profiles)`);
}

main();
