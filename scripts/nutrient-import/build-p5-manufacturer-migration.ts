/**
 * Generate supabase/migrations/20261023120000_adr014_p5_manufacturer_catalog.sql
 * Run: pnpm nutrient:build-p5-migration
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogDedupeRetentionSql } from './catalog-dedupe-migration-sql.ts';
import {
  buildP4ImportModel,
  resolveMigrationExternalKey,
  skipCatalogAliasForMigration,
  type P4Product,
  type P4ProductPatch,
} from './p4-manufacturer-import.ts';
import { buildP5ImportModel } from './p5-manufacturer-import.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'supabase/migrations/20261023120000_adr014_p5_manufacturer_catalog.sql');

const PRIOR_PRODUCT_MIGRATION_FILES = [
  'supabase/migrations/20261021120100_adr014_nutrient_seed.sql',
  'supabase/migrations/20261022160000_adr014_p4_manufacturer_sources.sql',
];

function loadPriorProductExternalKeys(): Set<string> {
  const keys = new Set<string>();
  for (const rel of PRIOR_PRODUCT_MIGRATION_FILES) {
    const sql = readFileSync(path.join(ROOT, rel), 'utf8');
    for (const m of sql.matchAll(/::uuid,\s*'([^']+\|[^']+)'/g)) {
      keys.add(m[1]);
    }
    for (const m of sql.matchAll(/where fp\.external_key = '([^']+\|[^']+)'/g)) {
      keys.add(m[1]);
    }
    for (const m of sql.matchAll(/where external_key = '([^']+\|[^']+)'/g)) {
      keys.add(m[1]);
    }
  }
  return keys;
}

function sqlStr(s: string | null | undefined): string {
  if (s == null) return 'null';
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlJson(obj: unknown): string {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function withResolvedPatchKey(patch: P4ProductPatch): P4ProductPatch {
  const key = resolveMigrationExternalKey(patch.external_key);
  if (key === patch.external_key) return patch;
  return { ...patch, external_key: key };
}

function emitEnsureProductForPatch(chunks: string[], externalKey: string) {
  chunks.push(`do $$ begin
  if not exists (
    select 1 from public.fertilizer_products where external_key = ${sqlStr(externalKey)}
  ) then
    raise exception 'P5 migration: missing fertilizer_product for external_key=%', ${sqlStr(externalKey)};
  end if;
end $$;`);
}

function emitProductPatchSql(chunks: string[], patch: P4ProductPatch) {
  const resolved = withResolvedPatchKey(patch);
  const formSet =
    resolved.physical_form && resolved.dose_unit
      ? `  physical_form = ${sqlStr(resolved.physical_form)}::public.nutrient_physical_form,
  dose_unit = ${sqlStr(resolved.dose_unit)}::public.nutrient_dose_unit,
`
      : '';
  chunks.push(`update public.fertilizer_products fp
set
${formSet}  source_id = ${sqlStr(resolved.source_id)}::uuid,
  license = ${sqlStr(resolved.license)},
  retrieved_at = ${sqlStr(resolved.retrieved_at)}::timestamptz,
  trust_level = ${sqlStr(resolved.trust_level)}::public.nutrient_trust_level,
  verification_status = ${sqlStr(resolved.verification_status)}::public.nutrient_verification_status,
  metadata = coalesce(fp.metadata, '{}'::jsonb) || ${sqlJson(resolved.metadata)},
  updated_at = now()
where fp.external_key = ${sqlStr(resolved.external_key)};`);
  if (resolved.lines.length) {
    emitEnsureProductForPatch(chunks, resolved.external_key);
    for (const line of resolved.lines) {
      chunks.push(`insert into public.fertilizer_composition_lines (
  product_id, form_key, value_pct, source_id, license, retrieved_at, trust_level, verification_status
) values (
  (select id from public.fertilizer_products where external_key = ${sqlStr(resolved.external_key)}),
  ${sqlStr(line.form_key)},
  ${line.value_pct},
  ${sqlStr(resolved.source_id)}::uuid,
  ${sqlStr(resolved.license)},
  ${sqlStr(resolved.retrieved_at)}::timestamptz,
  ${sqlStr(resolved.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(resolved.verification_status)}::public.nutrient_verification_status
) on conflict (product_id, form_key) do update set
  value_pct = excluded.value_pct,
  source_id = excluded.source_id,
  retrieved_at = excluded.retrieved_at,
  updated_at = now();`);
    }
  }
  chunks.push('');
}

function emitNewProductSql(chunks: string[], p: P4Product) {
  chunks.push(`insert into public.fertilizer_products (
  id, external_key, brand, name, physical_form, dose_unit, is_custom, source_id, license, retrieved_at,
  trust_level, verification_status, metadata
) values (
  ${sqlStr(p.id)}::uuid,
  ${sqlStr(p.external_key)},
  ${sqlStr(p.brand)},
  ${sqlStr(p.name)},
  ${sqlStr(p.physical_form)}::public.nutrient_physical_form,
  ${sqlStr(p.dose_unit)}::public.nutrient_dose_unit,
  false,
  ${sqlStr(p.source_id)}::uuid,
  ${sqlStr(p.license)},
  ${sqlStr(p.retrieved_at)}::timestamptz,
  ${sqlStr(p.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(p.verification_status)}::public.nutrient_verification_status,
  ${sqlJson(p.metadata)}
) on conflict (external_key) do update set
  brand = excluded.brand,
  name = excluded.name,
  physical_form = excluded.physical_form,
  dose_unit = excluded.dose_unit,
  source_id = excluded.source_id,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  verification_status = excluded.verification_status,
  metadata = excluded.metadata,
  updated_at = now();`);
  if (p.lines.length) {
    emitEnsureProductForPatch(chunks, p.external_key);
    for (const line of p.lines) {
      chunks.push(`insert into public.fertilizer_composition_lines (
  product_id, form_key, value_pct, source_id, license, retrieved_at, trust_level, verification_status
) values (
  (select id from public.fertilizer_products where external_key = ${sqlStr(p.external_key)}),
  ${sqlStr(line.form_key)},
  ${line.value_pct},
  ${sqlStr(p.source_id)}::uuid,
  ${sqlStr(p.license)},
  ${sqlStr(p.retrieved_at)}::timestamptz,
  ${sqlStr(p.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(p.verification_status)}::public.nutrient_verification_status
) on conflict (product_id, form_key) do update set
  value_pct = excluded.value_pct,
  updated_at = now();`);
    }
  }
  chunks.push('');
}

function mergeMigrationNewProducts(
  p5New: P4Product[],
  p4New: P4Product[],
  priorKeys: Set<string>,
): P4Product[] {
  const byKey = new Map<string, P4Product>();
  for (const p of [...p5New, ...p4New]) {
    const key = resolveMigrationExternalKey(p.external_key);
    if (priorKeys.has(key)) continue;
    byKey.set(key, key === p.external_key ? p : { ...p, external_key: key });
  }
  return [...byKey.values()];
}

function main() {
  const model = buildP5ImportModel();
  const p4 = buildP4ImportModel();
  const priorKeys = loadPriorProductExternalKeys();
  const newProducts = mergeMigrationNewProducts(model.newProducts, p4.newProducts, priorKeys);

  const p5PatchKeys = new Set(model.productPatches.map((p) => p.external_key));
  const p4Patches = p4.productPatches.filter((p) => !p5PatchKeys.has(p.external_key));
  const allPatches = [...model.productPatches, ...p4Patches];

  const chunks: string[] = [
    '-- ADR-014 P5: manufacturer catalog expansion (generated by pnpm nutrient:build-p5-migration)',
    '-- Raw extracts: data/nutrient/manufacturers/*/extracted.json',
    '',
  ];

  for (const s of model.sources) {
    chunks.push(`insert into public.nutrient_data_sources (
  id, slug, name, source_type, citation, url, license, retrieved_at, verification_status, trust_level, notes
) values (
  ${sqlStr(s.id)}::uuid,
  ${sqlStr(s.slug)},
  ${sqlStr(s.name)},
  ${sqlStr(s.source_type)},
  ${sqlStr(s.citation)},
  ${sqlStr(s.url)},
  ${sqlStr(s.license)},
  ${sqlStr(s.retrieved_at)}::timestamptz,
  ${sqlStr(s.verification_status)}::public.nutrient_verification_status,
  ${sqlStr(s.trust_level)}::public.nutrient_trust_level,
  ${sqlJson(s.notes)}
) on conflict (slug) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  citation = excluded.citation,
  url = excluded.url,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  verification_status = excluded.verification_status,
  trust_level = excluded.trust_level,
  notes = excluded.notes,
  updated_at = now();`);
    chunks.push('');
  }

  for (const tp of model.targetProfiles) {
    chunks.push(`insert into public.target_solution_profiles (
  id, slug, name, stage, target_ppm, overdose_pct, source_id, citation, url, license, retrieved_at, trust_level, verification_status, metadata
) values (
  ${sqlStr(tp.id)}::uuid,
  ${sqlStr(tp.slug)},
  ${sqlStr(tp.name)},
  ${sqlStr(tp.stage)},
  ${sqlJson(tp.target_ppm)},
  '{}'::jsonb,
  ${sqlStr(tp.source_id)}::uuid,
  ${sqlStr(tp.citation)},
  ${sqlStr(tp.url)},
  ${sqlStr(tp.license)},
  ${sqlStr(tp.retrieved_at)}::timestamptz,
  ${sqlStr(tp.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(tp.verification_status)}::public.nutrient_verification_status,
  ${sqlJson(tp.metadata)}
) on conflict (slug) do update set
  name = excluded.name,
  stage = excluded.stage,
  target_ppm = excluded.target_ppm,
  source_id = excluded.source_id,
  citation = excluded.citation,
  url = excluded.url,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  verification_status = excluded.verification_status,
  metadata = excluded.metadata,
  updated_at = now();`);
    chunks.push('');
  }

  for (const p of newProducts) {
    emitNewProductSql(chunks, p);
  }

  for (const patch of allPatches) {
    emitProductPatchSql(chunks, patch);
  }

  for (const mp of model.metadataPatches) {
    const key = resolveMigrationExternalKey(mp.external_key);
    chunks.push(`update public.fertilizer_products fp
set
  source_id = ${sqlStr(mp.source_id)}::uuid,
  license = ${sqlStr(mp.license)},
  retrieved_at = ${sqlStr(mp.retrieved_at)}::timestamptz,
  trust_level = ${sqlStr(mp.trust_level)}::public.nutrient_trust_level,
  verification_status = ${sqlStr(mp.verification_status)}::public.nutrient_verification_status,
  metadata = coalesce(fp.metadata, '{}'::jsonb) || ${sqlJson(mp.metadata)},
  updated_at = now()
where fp.external_key = ${sqlStr(key)};`);
    chunks.push('');
  }

  for (const sched of model.feedSchedules) {
    chunks.push(`insert into public.feed_schedules (
  id, slug, name, manufacturer, profile_id, source_id, license, retrieved_at, trust_level, verification_status, metadata
) values (
  ${sqlStr(sched.id)}::uuid,
  ${sqlStr(sched.slug)},
  ${sqlStr(sched.name)},
  ${sqlStr(sched.manufacturer)},
  null,
  ${sqlStr(sched.source_id)}::uuid,
  ${sqlStr(sched.license)},
  ${sqlStr(sched.retrieved_at)}::timestamptz,
  ${sqlStr(sched.trust_level)}::public.nutrient_trust_level,
  ${sqlStr(sched.verification_status)}::public.nutrient_verification_status,
  ${sqlJson(sched.metadata)}
) on conflict (slug) do update set
  name = excluded.name,
  manufacturer = excluded.manufacturer,
  source_id = excluded.source_id,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  verification_status = excluded.verification_status,
  metadata = excluded.metadata,
  updated_at = now();`);
    for (const step of sched.steps) {
      const productKey = resolveMigrationExternalKey(step.product_external_key);
      chunks.push(`insert into public.feed_schedule_steps (
  schedule_id, step_order, label, profile_id, notes, source_id, license, retrieved_at, trust_level
) values (
  (select id from public.feed_schedules where slug = ${sqlStr(sched.slug)}),
  ${step.step_order},
  ${sqlStr(step.label)},
  null,
  ${sqlStr(JSON.stringify({
    product_external_key: productKey,
    dose_per_l: step.dose_per_l,
    ...(step.dose_per_l_min != null ? { dose_per_l_min: step.dose_per_l_min } : {}),
    ...(step.dose_per_l_max != null ? { dose_per_l_max: step.dose_per_l_max } : {}),
    ...(step.dose_note ? { dose_note: step.dose_note } : {}),
    unit: step.unit,
  }))},
  ${sqlStr(sched.source_id)}::uuid,
  ${sqlStr(sched.license)},
  ${sqlStr(sched.retrieved_at)}::timestamptz,
  ${sqlStr(sched.trust_level)}::public.nutrient_trust_level
) on conflict (schedule_id, step_order) do update set
  label = excluded.label,
  notes = excluded.notes,
  updated_at = now();`);
    }
    chunks.push('');
  }

  for (const a of p4.aliasRows) {
    if (skipCatalogAliasForMigration(a.alias_external_key, a.canonical_external_key)) continue;
    chunks.push(`insert into public.fertilizer_product_aliases (
  alias_external_key, canonical_external_key, source_id, license, retrieved_at, trust_level
) values (
  ${sqlStr(a.alias_external_key)},
  ${sqlStr(a.canonical_external_key)},
  ${sqlStr(a.source_id)}::uuid,
  'Catalog alias for legacy external_key (P5 dedupe)',
  now(),
  'low'::public.nutrient_trust_level
) on conflict (alias_external_key) do update set
  canonical_external_key = excluded.canonical_external_key,
  source_id = excluded.source_id,
  updated_at = now();`);
  }
  chunks.push(catalogDedupeRetentionSql());
  chunks.push('');

  writeFileSync(OUT, chunks.join('\n') + '\n');
  console.log('Wrote', OUT, {
    sources: model.sources.length,
    newProducts: newProducts.length,
    patches: allPatches.length,
    metadataPatches: model.metadataPatches.length,
    schedules: model.feedSchedules.length,
    targetProfiles: model.targetProfiles.length,
    aliases: p4.aliasRows.filter(
      (a) => !skipCatalogAliasForMigration(a.alias_external_key, a.canonical_external_key),
    ).length,
  });
}

main();
