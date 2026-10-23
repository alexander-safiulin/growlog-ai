/**
 * P4 manufacturer import model (official extracted JSON + HydroBuddy DBF parse).
 * Used by migration SQL generator and catalog bundle merge.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferSolubilityKeyFromDeclaredPct } from '../../packages/nutrient-calc/src/solubility-key.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const OFFICIAL_DIR = path.join(ROOT, 'supabase/seed/nutrient/manufacturers-official');

export const HYDROODO_ARCHIVE_URL =
  'https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/hydroodo/hydroodo18.rar';

export const SOURCE_IDS = {
  taTripart: '863eb08c-0bbe-43da-adfa-7549f78a5b94',
  hydrobuddy: '69fd1994-9ce2-4805-a898-a1fef97d7236',
  hydroodo: '32634bba-f091-4627-abad-0cb68f829d2b',
  plagron: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  athena: 'b2c3d4e5-f6a7-4890-b123-456789abcdef',
  canna: 'c3d4e5f6-a7b8-4901-c234-56789abcdef0',
  advancedNutrients: 'd4e5f6a7-b8c9-4012-d345-6789abcdef01',
  biobizz: 'e5f6a7b8-c9d0-4123-e456-789abcdef012',
  houseGarden: 'f6a7b8c9-d0e1-4234-f567-89abcdef0123',
} as const;

export function stableUuid(seed: string): string {
  const h = createHash('sha256').update(`growlog-nutrient-v1:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function slugKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Hydroodo / farm-recipe style keys (spaces, lowercase name). */
export function hydroodoProductKey(brand: string, name: string): string {
  return `${brand.trim()}|${name.trim().toLowerCase()}`;
}

function registerCatalogAlias(
  aliasRows: P4ImportModel['aliasRows'],
  deleteProductExternalKeys: string[],
  alias: string,
  canonical: string,
  source_id: string,
) {
  if (alias === canonical) return;
  if (!deleteProductExternalKeys.includes(alias)) deleteProductExternalKeys.push(alias);
  if (!aliasRows.some((a) => a.alias_external_key === alias)) {
    aliasRows.push({ alias_external_key: alias, canonical_external_key: canonical, source_id });
  }
}

export type DeclaredLine = { form_key: string; value_pct: number };

export function gaPctToLines(ga: Record<string, number | null | undefined>): DeclaredLine[] {
  return buildGaImport(ga).lines;
}

export function buildGaImport(ga: Record<string, number | null | undefined>): {
  lines: DeclaredLine[];
  metadata: Record<string, unknown>;
} {
  const map: Record<string, string> = {
    N_NO3: 'NO3',
    N_NH4: 'NH4',
    N_NH2: 'NH2',
    N_total: 'N',
    P2O5: 'P2O5',
    K2O: 'K2O',
    CaO: 'CaO',
    MgO: 'MgO',
    SO3: 'SO3',
    SO4: 'SO4',
    P: 'P',
    K: 'K',
    Ca: 'Ca',
    Mg: 'Mg',
    S: 'S',
    B: 'B',
    Cu: 'Cu',
    Fe: 'Fe',
    Mn: 'Mn',
    Mo: 'Mo',
    Zn: 'Zn',
  };
  const hasSplitN = (ga.N_NO3 ?? 0) > 0 || (ga.N_NH4 ?? 0) > 0;
  const metadata: Record<string, unknown> = {};
  if (hasSplitN && (ga.N_total ?? 0) > 0) {
    metadata.n_total_includes_forms = true;
  }
  const lines: DeclaredLine[] = [];
  for (const [k, v] of Object.entries(ga)) {
    if (v == null || v === 0) continue;
    if (k === 'N_total' && hasSplitN) continue;
    const form = map[k] ?? k;
    lines.push({ form_key: form, value_pct: v });
  }
  return { lines, metadata };
}

export function lbPerGalToDensityGPerMl(lbPerGal: number): number {
  return (lbPerGal * 453.59237) / 3785.411784;
}

export interface P4Product {
  id: string;
  external_key: string;
  brand: string;
  name: string;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  source_id: string;
  license: string;
  retrieved_at: string;
  trust_level: 'high' | 'medium' | 'low' | 'unverified';
  verification_status: 'verified' | 'spot_checked' | 'unverified' | 'known_error';
  metadata: Record<string, unknown>;
  lines: DeclaredLine[];
}

export interface P4Source {
  id: string;
  slug: string;
  name: string;
  source_type: string;
  citation: string;
  url: string;
  license: string;
  retrieved_at: string;
  verification_status: string;
  trust_level: string;
  notes: Record<string, unknown>;
}

export interface P4FeedSchedule {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  source_id: string;
  license: string;
  retrieved_at: string;
  trust_level: string;
  verification_status: string;
  metadata: Record<string, unknown>;
  steps: Array<{
    step_order: number;
    label: string;
    product_external_key: string;
    dose_per_l: number;
    unit: 'ml_per_L' | 'g_per_L';
  }>;
}

export interface P4ProductPatch {
  external_key: string;
  name?: string;
  physical_form?: 'solid' | 'liquid';
  dose_unit?: 'g_per_L' | 'ml_per_L';
  source_id: string;
  license: string;
  retrieved_at: string;
  trust_level: string;
  verification_status: string;
  metadata: Record<string, unknown>;
  lines: DeclaredLine[];
}

export interface P4ImportModel {
  sources: P4Source[];
  newProducts: P4Product[];
  productPatches: P4ProductPatch[];
  deleteProductExternalKeys: string[];
  feedSchedules: P4FeedSchedule[];
  aliasRows: Array<{ alias_external_key: string; canonical_external_key: string; source_id: string }>;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

type HydroBuddyRow = Record<string, string>;

function hydrobuddySkip(row: HydroBuddyRow): boolean {
  const name = row.NAME ?? '';
  if (/test|si_test/i.test(name)) return true;
  if (/^CH\s*-\s*micro/i.test(name)) return true;
  if (row.FORMULA === 'NaNO3' && parseFloat(row.FE ?? '0') > 5) return true;
  return false;
}

function hydrobuddyLines(row: HydroBuddyRow): DeclaredLine[] {
  const lines: DeclaredLine[] = [];
  const add = (form: string, raw: string | undefined) => {
    const v = parseFloat(raw ?? '0');
    if (v > 0) lines.push({ form_key: form, value_pct: v });
  };
  add('NO3', row['N (NO3-)']);
  add('NH4', row['N (NH4+)']);
  add('P', row.P);
  add('K', row.K);
  add('Ca', row.CA);
  add('Mg', row.MG);
  add('S', row.S);
  add('B', row.B);
  add('Fe', row.FE);
  add('Zn', row.ZN);
  add('Mn', row.MN);
  add('Cu', row.CU);
  add('Mo', row.MO);
  add('Na', row.NA);
  add('Cl', row.CL);
  add('Si', row.SI);
  return lines;
}

function productFromDeclared(input: {
  brand: string;
  name: string;
  external_key: string;
  source_id: string;
  license: string;
  retrieved_at: string;
  trust_level: P4Product['trust_level'];
  verification_status: P4Product['verification_status'];
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  metadata: Record<string, unknown>;
  lines: DeclaredLine[];
}): P4Product {
  const declared = Object.fromEntries(input.lines.map((l) => [l.form_key, l.value_pct]));
  const solKey = inferSolubilityKeyFromDeclaredPct(declared, input.external_key);
  const metadata = { ...input.metadata };
  if (solKey) metadata.solubility_key = solKey;
  return {
    id: stableUuid(`product:${input.external_key}`),
    ...input,
    metadata,
    lines: input.lines,
  };
}

export function buildP4ImportModel(): P4ImportModel {
  const sources: P4Source[] = [];
  const newProducts: P4Product[] = [];
  const productPatches: P4ProductPatch[] = [];
  const deleteProductExternalKeys: string[] = ['hydrobuddy|ch-micro'];
  const feedSchedules: P4FeedSchedule[] = [];
  const aliasRows: P4ImportModel['aliasRows'] = [];

  const ta = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      ga_pct: Record<string, number>;
      source_url: string;
    }>;
    feed_chart: {
      source_url: string;
      hydro_coco_ml_per_L: Record<string, { grow: number; micro: number; bloom: number }>;
    };
  }>(path.join(OFFICIAL_DIR, 'terra-aquatica/extracted.json'));

  sources.push({
    id: SOURCE_IDS.taTripart,
    slug: 'terra-aquatica-tripart-official',
    name: 'Terra Aquatica TriPart (official labels & 2023 application table)',
    source_type: 'manufacturer_label',
    citation: 'Terra Aquatica TriPart guaranteed analysis and 2023 application table (ml/L).',
    url: ta.feed_chart.source_url,
    license: 'Manufacturer published label/chart; verify before redistribution.',
    retrieved_at: `${ta.retrieved_at}T00:00:00Z`,
    verification_status: 'spot_checked',
    trust_level: 'high',
    notes: { provenance_class: 'manufacturer_label' },
  });

  const taKeyMap: Record<string, string> = {
    'TriPart Grow (ex FloraGro)': 'ghe (general hydroponics) france|floragro',
    'TriPart Bloom (ex FloraBloom)': 'ghe (general hydroponics) france|florabloom',
    'TriPart Micro Soft Water': 'ghe (general hydroponics) france|floramicro softwater',
    'TriPart Micro Hard Water': 'ghe (general hydroponics) france|floramicro hardwater',
  };

  for (const p of ta.products) {
    const external_key = taKeyMap[p.name];
    if (!external_key) continue;
    const ga = buildGaImport(p.ga_pct);
    productPatches.push({
      external_key,
      name: p.name.includes('TriPart') ? p.name.replace(' (ex ', ' — ').replace(')', '') : undefined,
      source_id: SOURCE_IDS.taTripart,
      license: 'Manufacturer published label; verify before redistribution.',
      retrieved_at: `${ta.retrieved_at}T00:00:00Z`,
      trust_level: 'high',
      verification_status: 'spot_checked',
      metadata: {
        provenance_class: 'manufacturer_label',
        label_url: p.source_url,
        manufacturer_source_slug: 'terra-aquatica-tripart-official',
        catalog_name: 'TriPart',
        ...ga.metadata,
      },
      lines: ga.lines,
    });
  }

  const stepKeys = {
    grow: 'ghe (general hydroponics) france|floragro',
    micro: 'ghe (general hydroponics) france|floramicro softwater',
    bloom: 'ghe (general hydroponics) france|florabloom',
  };
  for (const [stage, doses] of Object.entries(ta.feed_chart.hydro_coco_ml_per_L)) {
    const slug = `ghe-tripart-2023-${stage.replace(/_/g, '-')}`;
    feedSchedules.push({
      id: stableUuid(`schedule:${slug}`),
      slug,
      name: `TriPart 2023 — ${stage.replace(/_/g, ' ')} (hydro/coco ml/L)`,
      manufacturer: 'Terra Aquatica',
      source_id: SOURCE_IDS.taTripart,
      license: 'Manufacturer 2023 application table.',
      retrieved_at: `${ta.retrieved_at}T00:00:00Z`,
      trust_level: 'high',
      verification_status: 'spot_checked',
      metadata: {
        provenance_class: 'manufacturer_feedchart',
        chart_url: ta.feed_chart.source_url,
      },
      steps: [
        { step_order: 1, label: 'TriPart Grow', product_external_key: stepKeys.grow, dose_per_l: doses.grow, unit: 'ml_per_L' },
        { step_order: 2, label: 'TriPart Micro', product_external_key: stepKeys.micro, dose_per_l: doses.micro, unit: 'ml_per_L' },
        { step_order: 3, label: 'TriPart Bloom', product_external_key: stepKeys.bloom, dose_per_l: doses.bloom, unit: 'ml_per_L' },
      ],
    });
  }

  sources.push({
    id: SOURCE_IDS.hydrobuddy,
    slug: 'hydrobuddy-salts-community',
    name: 'HydroBuddy salt composition reference',
    source_type: 'open_source_db',
    citation: 'HydroBuddy substances_win.dbf (GPL upstream); elemental % transcribed.',
    url: 'https://github.com/danielfppps/hydrobuddy',
    license: 'Facts transcribed independently; no GPL code in Growlog repo.',
    retrieved_at: '2026-10-22T00:00:00Z',
    verification_status: 'spot_checked',
    trust_level: 'low',
    notes: { provenance_class: 'community' },
  });

  const hbRows = readJson<HydroBuddyRow[]>(
    path.join(OFFICIAL_DIR, 'hydrobuddy/substances_win.parsed.json'),
  );
  for (const row of hbRows) {
    if (hydrobuddySkip(row)) continue;
    const formula = row.FORMULA?.trim() || row.NAME;
    const ext = formula === 'K2SO4' ? 'hydrobuddy|k2so4' : `hydrobuddy|${slugKey(formula)}`;
    const lines = hydrobuddyLines(row);
    if (!lines.length) continue;
    const isLiquid = row.ISLIQUID === '1.00000000';
    const hbMeta: Record<string, unknown> = {
      provenance_class: 'community',
      hydrobuddy_formula: formula,
      hydrobuddy_name: row.NAME,
    };
    const purity = parseFloat(row.PURITY ?? '1');
    if (purity > 0 && purity <= 1) hbMeta.purity_mass_fraction = purity;
    const density = parseFloat(row.DENSITY ?? '0');
    if (density > 0) hbMeta.density_g_ml = density;
    if (formula === 'H3PO4' && /75%/.test(row.NAME ?? '')) {
      hbMeta.purity_mass_fraction = 0.75;
      hbMeta.density_g_ml = 1.579;
    }
    newProducts.push(
      productFromDeclared({
        brand: 'HydroBuddy reference',
        name: row.NAME?.trim() || formula,
        external_key: ext,
        source_id: SOURCE_IDS.hydrobuddy,
        license: 'HydroBuddy DBF elemental %; upstream GPL.',
        retrieved_at: '2026-10-22T00:00:00Z',
        trust_level: 'low',
        verification_status: 'spot_checked',
        physical_form: isLiquid ? 'liquid' : 'solid',
        dose_unit: isLiquid ? 'ml_per_L' : 'g_per_L',
        metadata: hbMeta,
        lines,
      }),
    );
  }

  const plagron = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      ga_pct?: Record<string, number>;
      density_g_ml?: number;
      source_url: string;
    }>;
  }>(path.join(OFFICIAL_DIR, 'plagron/extracted.json'));

  sources.push({
    id: SOURCE_IDS.plagron,
    slug: 'plagron-official-tds',
    name: 'Plagron official TDS (2024-09-27)',
    source_type: 'manufacturer_label',
    citation: 'Plagron technical data sheets.',
    url: 'https://plagron.com/downloads/en/hydro-a-tds',
    license: 'Manufacturer TDS; verify before redistribution.',
    retrieved_at: `${plagron.retrieved_at}T00:00:00Z`,
    verification_status: 'spot_checked',
    trust_level: 'high',
    notes: { provenance_class: 'manufacturer_label' },
  });

  for (const p of plagron.products) {
    if (!p.ga_pct) continue;
    const ext = hydroodoProductKey('plagron', p.name);
    const hyphen = `plagron|${slugKey(p.name)}`;
    const meta: Record<string, unknown> = {
      provenance_class: 'manufacturer_label',
      source_url: p.source_url,
      partial_composition: false,
    };
    if (p.density_g_ml) meta.density_g_ml = p.density_g_ml;
    const ga = buildGaImport(p.ga_pct);
    productPatches.push({
      external_key: ext,
      physical_form: 'liquid',
      dose_unit: 'ml_per_L',
      source_id: SOURCE_IDS.plagron,
      license: 'Plagron TDS 2024-09-27.',
      retrieved_at: `${plagron.retrieved_at}T00:00:00Z`,
      trust_level: 'high',
      verification_status: 'spot_checked',
      metadata: { ...meta, ...ga.metadata },
      lines: ga.lines,
    });
    registerCatalogAlias(aliasRows, deleteProductExternalKeys, hyphen, ext, SOURCE_IDS.plagron);
  }

  const athena = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      ga_pct?: Record<string, number>;
      form?: string;
      source_url: string;
      source_kind?: string;
      density_lb_per_gal?: number;
    }>;
  }>(path.join(OFFICIAL_DIR, 'athena/extracted.json'));

  sources.push({
    id: SOURCE_IDS.athena,
    slug: 'athena-official-labels',
    name: 'Athena Ag official labels / SDS index',
    source_type: 'manufacturer_label',
    citation: 'Athena label PDFs (official Drive) and retailer-hosted copies where noted.',
    url: 'https://www.athenaag.com/sds-sheets',
    license: 'Manufacturer label; retailer copies marked medium trust.',
    retrieved_at: `${athena.retrieved_at}T00:00:00Z`,
    verification_status: 'spot_checked',
    trust_level: 'high',
    notes: { provenance_class: 'manufacturer_label' },
  });

  for (const p of athena.products) {
    if (!p.ga_pct) continue;
    const trust = p.source_kind?.includes('retailer') ? 'medium' : 'high';
    const ext = `athena|${slugKey(p.name)}`;
    const liquid = p.form === 'liquid';
    const ga = buildGaImport(p.ga_pct);
    const meta: Record<string, unknown> = {
      provenance_class: 'manufacturer_label',
      source_url: p.source_url,
      retailer_copy: !!p.source_kind?.includes('retailer'),
      ...ga.metadata,
    };
    if (p.density_lb_per_gal) meta.density_g_ml = lbPerGalToDensityGPerMl(p.density_lb_per_gal);
    newProducts.push(
      productFromDeclared({
        brand: 'Athena',
        name: p.name,
        external_key: ext,
        source_id: SOURCE_IDS.athena,
        license: p.source_kind ?? 'Athena official label PDF.',
        retrieved_at: `${athena.retrieved_at}T00:00:00Z`,
        trust_level: trust,
        verification_status: 'spot_checked',
        physical_form: liquid ? 'liquid' : 'solid',
        dose_unit: liquid ? 'ml_per_L' : 'g_per_L',
        metadata: meta,
        lines: ga.lines,
      }),
    );
  }

  const canna = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      ga_pct?: Record<string, number>;
      source_url: string;
      official_dose?: string;
      density_lb_per_gal?: number;
      composition: null | Record<string, number>;
    }>;
  }>(path.join(OFFICIAL_DIR, 'canna/extracted.json'));

  sources.push({
    id: SOURCE_IDS.canna,
    slug: 'canna-official',
    name: 'CANNA official / cannagardening analyses',
    source_type: 'manufacturer_label',
    citation: 'CANNA Coco HC guaranteed analysis from cannagardening.com.',
    url: 'https://www.cannagardening.com/cocohc',
    license: 'Manufacturer / authorized distributor page.',
    retrieved_at: `${canna.retrieved_at}T00:00:00Z`,
    verification_status: 'spot_checked',
    trust_level: 'high',
    notes: { provenance_class: 'manufacturer_label' },
  });

  for (const p of canna.products) {
    if (!p.ga_pct) continue;
    const ext = `canna|${slugKey(p.name)}`;
    const ga = buildGaImport(p.ga_pct);
    const meta: Record<string, unknown> = {
      provenance_class: 'manufacturer_label',
      source_url: p.source_url,
      official_dose: p.official_dose,
      ...ga.metadata,
    };
    if (p.density_lb_per_gal) meta.density_g_ml = lbPerGalToDensityGPerMl(p.density_lb_per_gal);
    newProducts.push(
      productFromDeclared({
        brand: 'CANNA',
        name: p.name,
        external_key: ext,
        source_id: SOURCE_IDS.canna,
        license: 'CANNA authorized analysis page.',
        retrieved_at: `${canna.retrieved_at}T00:00:00Z`,
        trust_level: 'high',
        verification_status: 'spot_checked',
        physical_form: 'liquid',
        dose_unit: 'ml_per_L',
        metadata: meta,
        lines: ga.lines,
      }),
    );
  }

  const an = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      canonical_external_key?: string;
      official_npk?: string;
      label_guaranteed_analysis_pct?: Record<string, number> | null;
      source_url: string;
      source_kind?: string;
      verification_status?: 'verified' | 'spot_checked' | 'unverified';
      trust_level?: 'high' | 'medium' | 'low' | 'unverified';
      catalog_mode?: 'patch' | 'new';
    }>;
  }>(path.join(OFFICIAL_DIR, 'advanced-nutrients/extracted.json'));

  sources.push({
    id: SOURCE_IDS.advancedNutrients,
    slug: 'advanced-nutrients-official',
    name: 'Advanced Nutrients official NPK / partial labels',
    source_type: 'manufacturer_label',
    citation: 'Advanced Nutrients site NPK; partial GA where available.',
    url: 'https://www.advancednutrients.com/',
    license: 'Manufacturer site; partial composition flagged in metadata.',
    retrieved_at: `${an.retrieved_at}T00:00:00Z`,
    verification_status: 'spot_checked',
    trust_level: 'medium',
    notes: { provenance_class: 'manufacturer_label', partial: true },
  });

  for (const p of an.products) {
    const ext = (p.canonical_external_key ?? hydroodoProductKey('Advanced Nutrients', p.name)).toLowerCase();
    const hyphen = `advanced nutrients|${slugKey(p.name)}`;
    registerCatalogAlias(aliasRows, deleteProductExternalKeys, hyphen, ext, SOURCE_IDS.advancedNutrients);
    const ga = p.label_guaranteed_analysis_pct ? buildGaImport(p.label_guaranteed_analysis_pct) : null;
    const lines = ga?.lines ?? [];
    const partial = !p.label_guaranteed_analysis_pct;
    const retailerCopy = !!p.source_kind?.includes('retailer');
    const trust = p.trust_level ?? (partial || retailerCopy ? 'medium' : 'high');
    const verification = p.verification_status ?? (partial ? 'unverified' : 'spot_checked');
    const meta = {
      provenance_class: 'manufacturer_label',
      source_url: p.source_url,
      partial_composition: partial,
      official_npk: p.official_npk,
      density_unknown: true,
      ...(ga?.metadata ?? {}),
    };
    const patchBase = {
      external_key: ext,
      source_id: SOURCE_IDS.advancedNutrients,
      license: partial ? 'Official NPK only on manufacturer site.' : p.source_kind ?? 'Retailer label copy.',
      retrieved_at: `${an.retrieved_at}T00:00:00Z`,
      trust_level: trust,
      verification_status: verification,
      metadata: meta,
      lines,
    };
    if (p.catalog_mode !== 'new') productPatches.push(patchBase);
    if (lines.length && p.catalog_mode === 'new') {
      newProducts.push(
        productFromDeclared({
          brand: 'Advanced Nutrients',
          name: p.name,
          external_key: ext,
          source_id: patchBase.source_id,
          license: patchBase.license,
          retrieved_at: patchBase.retrieved_at,
          trust_level: patchBase.trust_level,
          verification_status: patchBase.verification_status,
          physical_form: 'liquid',
          dose_unit: 'ml_per_L',
          metadata: meta,
          lines,
        }),
      );
    }
  }

  const ghLegacyAliases: Array<[string, string]> = [
    ['general hydroponics (original usa)|floranova grow', 'ghe (general hydroponics) original usa|floranova grow'],
    ['general hydroponics (original usa)|floranova bloom', 'ghe (general hydroponics) original usa|floranova bloom'],
    ['general hydroponics (original usa)|maxigro', 'ghe (general hydroponics) original usa|maxigro'],
    ['general hydroponics (original usa)|maxibloom', 'ghe (general hydroponics) original usa|maxibloom'],
  ];
  for (const [alias, canonical] of ghLegacyAliases) {
    registerCatalogAlias(aliasRows, deleteProductExternalKeys, alias, canonical, SOURCE_IDS.hydrobuddy);
  }

  const biobizz = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      source_url: string;
      feed_schedule_ml_per_L?: Record<string, Record<string, number>>;
      official_dose?: string;
    }>;
  }>(path.join(OFFICIAL_DIR, 'biobizz/extracted.json'));

  sources.push({
    id: SOURCE_IDS.biobizz,
    slug: 'biobizz-official-feed',
    name: 'BioBizz official feed charts (composition not on label)',
    source_type: 'manufacturer_feedchart',
    citation: 'BioBizz data sheets — dose tables only.',
    url: 'https://biobizz.com/',
    license: 'Manufacturer datasheet; no guaranteed analysis imported.',
    retrieved_at: `${biobizz.retrieved_at}T00:00:00Z`,
    verification_status: 'spot_checked',
    trust_level: 'medium',
    notes: { provenance_class: 'manufacturer_feedchart', dose_only: true },
  });

  for (const p of biobizz.products) {
    if (!p.feed_schedule_ml_per_L) continue;
    const slug = `biobizz-${slugKey(p.name)}-light-mix`;
    const wk = p.feed_schedule_ml_per_L.light_mix;
    if (!wk) continue;
    feedSchedules.push({
      id: stableUuid(`schedule:${slug}`),
      slug,
      name: `${p.name} — light mix feed (mL/L)`,
      manufacturer: 'BioBizz',
      source_id: SOURCE_IDS.biobizz,
      license: 'BioBizz datasheet feed chart.',
      retrieved_at: `${biobizz.retrieved_at}T00:00:00Z`,
      trust_level: 'medium',
      verification_status: 'spot_checked',
      metadata: {
        provenance_class: 'manufacturer_feedchart',
        source_url: p.source_url,
        dose_only: true,
        product_name: p.name,
      },
      steps: Object.entries(wk).map(([week, dose], i) => ({
        step_order: i + 1,
        label: week,
        product_external_key: `biobizz|${slugKey(p.name)}`,
        dose_per_l: dose,
        unit: 'ml_per_L',
      })),
    });
  }

  const hg = readJson<{
    retrieved_at: string;
    products: Array<{
      name: string;
      ga_pct?: Record<string, number>;
      source_url: string;
      dose?: string;
    }>;
  }>(path.join(OFFICIAL_DIR, 'house-garden/extracted.json'));

  sources.push({
    id: SOURCE_IDS.houseGarden,
    slug: 'house-garden-official',
    name: 'House & Garden official product page',
    source_type: 'manufacturer_label',
    citation: 'House & Garden US product listing (partial GA).',
    url: 'https://house-garden.us/',
    license: 'Manufacturer site; verify A/B split.',
    retrieved_at: `${hg.retrieved_at}T00:00:00Z`,
    verification_status: 'unverified',
    trust_level: 'medium',
    notes: { provenance_class: 'manufacturer_label', partial: true },
  });

  for (const p of hg.products) {
    if (!p.ga_pct) continue;
    const ga = buildGaImport(p.ga_pct);
    newProducts.push(
      productFromDeclared({
        brand: 'House & Garden',
        name: p.name,
        external_key: `house & garden|${slugKey(p.name)}`,
        source_id: SOURCE_IDS.houseGarden,
        license: 'Manufacturer product page.',
        retrieved_at: `${hg.retrieved_at}T00:00:00Z`,
        trust_level: 'medium',
        verification_status: 'unverified',
        physical_form: 'liquid',
        dose_unit: 'ml_per_L',
        metadata: {
          provenance_class: 'manufacturer_label',
          source_url: p.source_url,
          official_dose: p.dose,
          partial_composition: true,
          ...ga.metadata,
        },
        lines: ga.lines,
      }),
    );
  }

  productPatches.push({
    external_key: 'буйские удобрения|сульфат калия',
    source_id: SOURCE_IDS.hydroodo,
    license: 'third-party, attribution, verify before redistribution',
    retrieved_at: '2026-10-21T00:00:00Z',
    trust_level: 'medium',
    verification_status: 'unverified',
    metadata: {
      corrected_from_hydroodo: {
        field: 'S',
        reason: 'K2SO4 typical sulfur ~18% w/w; Hydroodo listed K2O only',
      },
      provenance_class: 'hydroodo_legacy',
      solubility_key: 'K2SO4',
    },
    lines: [{ form_key: 'K2O', value_pct: 53 }, { form_key: 'S', value_pct: 18 }],
  });

  return {
    sources,
    newProducts: newProducts.filter(
      (p) => p.lines.length > 0 || p.metadata.partial_composition === true,
    ),
    productPatches,
    deleteProductExternalKeys,
    feedSchedules,
    aliasRows,
  };
}

export function mergeP4IntoBundle(bundle: {
  sources: Array<Record<string, unknown>>;
  fertilizers: Array<Record<string, unknown>>;
  feed_schedules: Array<Record<string, unknown>>;
  counts: Record<string, number>;
}, hydroSourceId: string) {
  const model = buildP4ImportModel();
  for (const s of model.sources) {
    if (!bundle.sources.some((x) => x.slug === s.slug)) {
      bundle.sources.push({
        id: s.id,
        slug: s.slug,
        name: s.name,
        citation: s.citation,
        url: s.url,
        license: s.license,
        retrieved_at: s.retrieved_at,
        verification_status: s.verification_status,
        trust_level: s.trust_level,
        notes: s.notes,
      });
    }
  }
  const hydro = bundle.sources.find((x) => x.slug === 'hydroodo-0.4b18');
  if (hydro) {
    hydro.url = HYDROODO_ARCHIVE_URL;
  }

  for (const patch of model.productPatches) {
    const p = bundle.fertilizers.find((f) => f.external_key === patch.external_key);
    if (!p) continue;
    if (patch.name) p.name = patch.name;
    if (patch.physical_form) p.physical_form = patch.physical_form;
    if (patch.dose_unit) p.dose_unit = patch.dose_unit;
    p.source_id = patch.source_id;
    p.trust_level = patch.trust_level;
    p.verification_status = patch.verification_status;
    p.retrieved_at = patch.retrieved_at;
    p.metadata = { ...(p.metadata as object), ...patch.metadata };
    if (patch.lines.length) {
      p.lines = patch.lines.map((l) => ({
        form_key: l.form_key,
        value_pct: l.value_pct,
        source_id: patch.source_id,
        trust_level: patch.trust_level,
        license: patch.license,
        retrieved_at: patch.retrieved_at,
      }));
    }
  }

  bundle.fertilizers = bundle.fertilizers.filter(
    (f) => !model.deleteProductExternalKeys.includes(f.external_key as string),
  );

  for (const np of model.newProducts) {
    if (bundle.fertilizers.some((f) => f.external_key === np.external_key)) continue;
    bundle.fertilizers.push({
      id: np.id,
      external_key: np.external_key,
      brand: np.brand,
      name: np.name,
      physical_form: np.physical_form,
      dose_unit: np.dose_unit,
      source_id: np.source_id,
      license: np.license,
      retrieved_at: np.retrieved_at,
      trust_level: np.trust_level,
      verification_status: np.verification_status,
      metadata: np.metadata,
      lines: np.lines.map((l) => ({
        form_key: l.form_key,
        value_pct: l.value_pct,
        source_id: np.source_id,
        trust_level: np.trust_level,
        license: np.license,
        retrieved_at: np.retrieved_at,
      })),
    });
  }

  for (const f of bundle.fertilizers) {
    if (f.source_id !== hydroSourceId) continue;
    const meta = (f.metadata as Record<string, unknown>) ?? {};
    if (!meta.provenance_class) f.metadata = { ...meta, provenance_class: 'hydroodo_legacy' };
  }

  bundle.feed_schedules = bundle.feed_schedules.filter(
    (s) =>
      !(String(s.slug).startsWith('ghe-flora') || String(s.slug).startsWith('ghe-tripart')),
  );
  for (const sched of model.feedSchedules) {
    bundle.feed_schedules.push({
      id: sched.id,
      slug: sched.slug,
      name: sched.name,
      manufacturer: sched.manufacturer,
      source_id: sched.source_id,
      trust_level: sched.trust_level,
      license: sched.license,
      retrieved_at: sched.retrieved_at,
      metadata: { ...sched.metadata, steps: sched.steps },
    });
  }

  const aliasList = (bundle.fertilizer_aliases as Array<Record<string, unknown>>) ?? [];
  for (const a of model.aliasRows) {
    if (aliasList.some((x) => x.alias_external_key === a.alias_external_key)) continue;
    aliasList.push({
      alias_external_key: a.alias_external_key,
      canonical_external_key: a.canonical_external_key,
      notes: { catalog_dedupe: true },
      source_id: a.source_id,
      license: 'Catalog alias for legacy external_key',
      retrieved_at: new Date().toISOString(),
      trust_level: 'low',
    });
  }
  bundle.fertilizer_aliases = aliasList;
  if (bundle.counts.fertilizer_aliases != null) {
    bundle.counts.fertilizer_aliases = aliasList.length;
  }

  bundle.counts.fertilizers = bundle.fertilizers.length;
}
