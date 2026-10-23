/**
 * P5 manufacturer catalog expansion — reads JSON under data/nutrient/manufacturers/.
 * Composes with P4 (manufacturers-official); generates delta for a NEW migration only.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildGaImport,
  type DeclaredLine,
  type P4FeedSchedule,
  type P4ImportModel,
  type P4Product,
  type P4ProductPatch,
  type P4Source,
  stableUuid,
} from './p4-manufacturer-import.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_MANUFACTURERS_DIR = path.join(ROOT, 'data/nutrient/manufacturers');

const RETRIEVED_DEFAULT = '2026-10-23T00:00:00Z';

export const P5_SOURCE_IDS = {
  ghUsa: stableUuid('source:gh-usa-official-labels'),
  jacks: stableUuid('source:jacks-nutrients-official'),
  emerald: stableUuid('source:emerald-harvest-official'),
  dutchPro: stableUuid('source:dutch-pro-official-feed'),
  hesi: stableUuid('source:hesi-official-catalog'),
  anFeed: stableUuid('source:advanced-nutrients-official-feed'),
  athenaFeed: stableUuid('source:athena-official-feed'),
  plagronDose: stableUuid('source:plagron-official-dosing'),
  mills: stableUuid('source:mills-official-labels'),
  greenplanet: stableUuid('source:greenplanet-official-booklet'),
  cuttingEdge: stableUuid('source:cutting-edge-official-labels'),
  masterblend: stableUuid('source:masterblend-official'),
  cannaFeed: stableUuid('source:canna-official-grow-guides'),
  anRetailer: stableUuid('source:advanced-nutrients-retailer-labels'),
} as const;

export interface P5TargetProfile {
  id: string;
  slug: string;
  name: string;
  stage: string;
  target_ppm: Record<string, number>;
  source_id: string;
  citation: string;
  url: string;
  license: string;
  retrieved_at: string;
  trust_level: string;
  verification_status: string;
  metadata: Record<string, unknown>;
}

export interface P5MetadataPatch {
  external_key: string;
  source_id: string;
  license: string;
  retrieved_at: string;
  trust_level: string;
  verification_status: string;
  metadata: Record<string, unknown>;
}

export interface P5ImportModel extends P4ImportModel {
  targetProfiles: P5TargetProfile[];
  metadataPatches: P5MetadataPatch[];
}

type ExtractSource = {
  slug: string;
  name: string;
  url: string;
  citation: string;
  license: string;
  source_type: string;
};

type ExtractProduct = {
  name: string;
  external_key?: string;
  patch?: boolean;
  npk?: string;
  ga_pct?: Record<string, number | null>;
  partial_composition?: boolean;
  feed_only?: boolean;
  form?: string;
  density_g_ml?: number | null;
  density_lb_per_gal?: number;
  source_url?: string;
  official_dose?: string;
  note?: string;
};

type ExtractFeedStepProduct = {
  name?: string;
  external_key?: string;
  dose_per_l: number;
  dose_per_l_min?: number;
  dose_per_l_max?: number;
  unit: 'ml_per_L' | 'g_per_L';
  note?: string;
};

type ExtractFeedSchedule = {
  slug: string;
  name: string;
  manufacturer: string;
  chart_url?: string;
  metadata?: Record<string, unknown>;
  steps: Array<{
    label: string;
    products: ExtractFeedStepProduct[];
    ec_target_ms_cm_max?: number;
    ph_target_min?: number;
    ph_target_max?: number;
  }>;
};

type ExtractFile = {
  brand: string;
  retrieved_at: string;
  source?: ExtractSource;
  products?: ExtractProduct[];
  feed_schedules?: ExtractFeedSchedule[];
  target_profiles?: Array<{
    slug: string;
    name: string;
    stage: string;
    target_ppm?: Record<string, number>;
    metadata?: Record<string, unknown>;
    url?: string;
  }>;
  product_metadata_patches?: Array<{ external_key: string; metadata: Record<string, unknown> }>;
  not_obtained?: string;
};

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function lbPerGalToDensityGPerMl(lbPerGal: number): number {
  return (lbPerGal * 453.59237) / 3785.411784;
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
  return {
    id: stableUuid(`product:${input.external_key}`),
    external_key: input.external_key,
    brand: input.brand,
    name: input.name,
    physical_form: input.physical_form,
    dose_unit: input.dose_unit,
    source_id: input.source_id,
    license: input.license,
    retrieved_at: input.retrieved_at,
    trust_level: input.trust_level,
    verification_status: input.verification_status,
    metadata: input.metadata,
    lines: input.lines,
  };
}

function resolveExternalKey(brand: string, name: string, explicit?: string): string {
  if (explicit) return explicit.toLowerCase();
  return `${brand.trim()}|${name.trim()}`.toLowerCase();
}

function sourceFromExtract(
  extract: ExtractFile,
  id: string,
  defaultSlug: string,
): P4Source | null {
  if (!extract.source) return null;
  const retrieved = `${extract.retrieved_at}T00:00:00Z`;
  return {
    id,
    slug: extract.source.slug || defaultSlug,
    name: extract.source.name,
    source_type: extract.source.source_type,
    citation: extract.source.citation,
    url: extract.source.url,
    license: extract.source.license,
    retrieved_at: retrieved,
    verification_status: 'spot_checked',
    trust_level: extract.source.source_type.includes('feed') ? 'medium' : 'high',
    notes: {
      provenance_class: extract.source.source_type,
      not_obtained: extract.not_obtained ?? null,
    },
  };
}

function listExtractFiles(): string[] {
  const dirs = readdirSync(DATA_MANUFACTURERS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(DATA_MANUFACTURERS_DIR, d.name, 'extracted.json'));
  return dirs.filter((f) => {
    try {
      readFileSync(f);
      return true;
    } catch {
      return false;
    }
  });
}

function flattenFeedSchedule(
  sched: ExtractFeedSchedule,
  source_id: string,
  license: string,
  retrieved_at: string,
  trust: string,
  resolveKey: (brand: string, name: string, ext?: string) => string,
  brand: string,
): P4FeedSchedule {
  const steps: P4FeedSchedule['steps'] = [];
  let order = 0;
  for (const step of sched.steps) {
    for (const prod of step.products) {
      order += 1;
      const ext =
        prod.external_key?.toLowerCase() ??
        resolveKey(brand, prod.name ?? 'unknown');
      steps.push({
        step_order: order,
        label: step.products.length > 1 ? `${step.label} — ${prod.name ?? ext}` : step.label,
        product_external_key: ext,
        dose_per_l: prod.dose_per_l,
        unit: prod.unit,
        ...(prod.dose_per_l_min != null ? { dose_per_l_min: prod.dose_per_l_min } : {}),
        ...(prod.dose_per_l_max != null ? { dose_per_l_max: prod.dose_per_l_max } : {}),
        ...(prod.note ? { dose_note: prod.note } : {}),
      });
    }
  }
  return {
    id: stableUuid(`schedule:${sched.slug}`),
    slug: sched.slug,
    name: sched.name,
    manufacturer: sched.manufacturer,
    source_id,
    license,
    retrieved_at,
    trust_level: trust,
    verification_status: 'spot_checked',
    metadata: {
      provenance_class: 'manufacturer_feedchart',
      chart_url: sched.chart_url,
      ...sched.metadata,
    },
    steps,
  };
}

const SOURCE_ID_BY_SLUG: Record<string, string> = {
  'gh-usa-official-labels': P5_SOURCE_IDS.ghUsa,
  'jacks-nutrients-official': P5_SOURCE_IDS.jacks,
  'emerald-harvest-official': P5_SOURCE_IDS.emerald,
  'dutch-pro-official-feed': P5_SOURCE_IDS.dutchPro,
  'hesi-official-catalog': P5_SOURCE_IDS.hesi,
  'advanced-nutrients-official-feed': P5_SOURCE_IDS.anFeed,
  'athena-official-feed': P5_SOURCE_IDS.athenaFeed,
  'plagron-official-dosing': P5_SOURCE_IDS.plagronDose,
  'biobizz-official-feed': 'e5f6a7b8-c9d0-4123-e456-789abcdef012',
  'mills-official-labels': P5_SOURCE_IDS.mills,
  'greenplanet-official-booklet': P5_SOURCE_IDS.greenplanet,
  'cutting-edge-official-labels': P5_SOURCE_IDS.cuttingEdge,
  'masterblend-official': P5_SOURCE_IDS.masterblend,
  'canna-official-grow-guides': P5_SOURCE_IDS.cannaFeed,
  'advanced-nutrients-retailer-labels': P5_SOURCE_IDS.anRetailer,
};

export function buildP5ImportModel(): P5ImportModel {
  const sources: P4Source[] = [];
  const newProducts: P4Product[] = [];
  const productPatches: P4ProductPatch[] = [];
  const feedSchedules: P4FeedSchedule[] = [];
  const targetProfiles: P5TargetProfile[] = [];
  const metadataPatches: P5MetadataPatch[] = [];

  for (const file of listExtractFiles()) {
    const extract = readJson<ExtractFile>(file);
    const slug = extract.source?.slug ?? path.basename(path.dirname(file));
    const sourceId = SOURCE_ID_BY_SLUG[slug] ?? stableUuid(`source:${slug}`);
    const retrieved = `${extract.retrieved_at}T00:00:00Z`;
    const src = sourceFromExtract(extract, sourceId, slug);
    if (src && !sources.some((s) => s.slug === src.slug)) sources.push(src);

    const license = extract.source?.license ?? 'Manufacturer published data';
    const trustDefault = src?.trust_level ?? 'medium';

    for (const p of extract.products ?? []) {
      const external_key = resolveExternalKey(extract.brand, p.name, p.external_key);
      const partial = !!p.partial_composition || !!p.feed_only || !p.ga_pct;
      const ga = p.ga_pct ? buildGaImport(p.ga_pct as Record<string, number | null | undefined>) : null;
      const lines = ga?.lines ?? [];
      const liquid = p.form === 'liquid' || (!p.form && lines.length && !partial);
      const meta: Record<string, unknown> = {
        provenance_class: extract.source?.source_type ?? 'manufacturer_label',
        source_url: p.source_url,
        official_npk: p.npk,
        partial_composition: partial,
        feed_only: p.feed_only ?? false,
        ...(ga?.metadata ?? {}),
      };
      if (p.note) meta.note = p.note;
      if (p.official_dose) meta.official_dose = p.official_dose;
      if (p.density_g_ml) meta.density_g_ml = p.density_g_ml;
      if (p.density_lb_per_gal) meta.density_g_ml = lbPerGalToDensityGPerMl(p.density_lb_per_gal);
      if (liquid && !meta.density_g_ml && !p.feed_only) meta.density_unknown = true;

      if (p.patch) {
        productPatches.push({
          external_key,
          source_id: sourceId,
          license,
          retrieved_at: retrieved,
          trust_level: partial ? 'medium' : 'high',
          verification_status: 'spot_checked',
          metadata: meta,
          lines,
        });
      } else if (partial && lines.length === 0) {
        newProducts.push(
          productFromDeclared({
            brand: extract.brand,
            name: p.name,
            external_key,
            source_id: sourceId,
            license,
            retrieved_at: retrieved,
            trust_level: 'medium',
            verification_status: 'spot_checked',
            physical_form: liquid ? 'liquid' : 'solid',
            dose_unit: liquid ? 'ml_per_L' : 'g_per_L',
            metadata: meta,
            lines: [],
          }),
        );
      } else {
        newProducts.push(
          productFromDeclared({
            brand: extract.brand,
            name: p.name,
            external_key,
            source_id: sourceId,
            license,
            retrieved_at: retrieved,
            trust_level: partial ? 'medium' : trustDefault,
            verification_status: 'spot_checked',
            physical_form: liquid ? 'liquid' : 'solid',
            dose_unit: liquid ? 'ml_per_L' : 'g_per_L',
            metadata: meta,
            lines,
          }),
        );
      }
    }

    for (const sched of extract.feed_schedules ?? []) {
      feedSchedules.push(
        flattenFeedSchedule(
          sched,
          sourceId,
          license,
          retrieved,
          trustDefault,
          (b, n, e) => resolveExternalKey(b, n, e),
          extract.brand,
        ),
      );
    }

    for (const tp of extract.target_profiles ?? []) {
      targetProfiles.push({
        id: stableUuid(`profile:${tp.slug}`),
        slug: tp.slug,
        name: tp.name,
        stage: tp.stage,
        target_ppm: tp.target_ppm ?? {},
        source_id: sourceId,
        citation: extract.source?.citation ?? tp.name,
        url: tp.url ?? extract.source?.url ?? '',
        license,
        retrieved_at: retrieved,
        trust_level: trustDefault,
        verification_status: 'spot_checked',
        metadata: {
          provenance_class: 'manufacturer_feedchart',
          ...(tp.metadata ?? {}),
        },
      });
    }

    for (const mp of extract.product_metadata_patches ?? []) {
      metadataPatches.push({
        external_key: mp.external_key.toLowerCase(),
        source_id: sourceId,
        license,
        retrieved_at: retrieved,
        trust_level: trustDefault,
        verification_status: 'spot_checked',
        metadata: {
          provenance_class: extract.source?.source_type ?? 'manufacturer_label',
          ...mp.metadata,
        },
      });
    }
  }

  // Dutch Pro placeholder products for feed-only schedule (no GA published)
  const dutchKeys = [
    ['Original Grow Hydro/Coco A', 'dutch pro|original-grow-hydro-coco-a'],
    ['Original Grow Hydro/Coco B', 'dutch pro|original-grow-hydro-coco-b'],
  ];
  for (const [name, ext] of dutchKeys) {
    if (newProducts.some((p) => p.external_key === ext)) continue;
    newProducts.push(
      productFromDeclared({
        brand: 'Dutch Pro',
        name,
        external_key: ext,
        source_id: P5_SOURCE_IDS.dutchPro,
        license: 'Feed chart only — no published guaranteed analysis',
        retrieved_at: RETRIEVED_DEFAULT,
        trust_level: 'low',
        verification_status: 'unverified',
        physical_form: 'liquid',
        dose_unit: 'ml_per_L',
        metadata: {
          provenance_class: 'manufacturer_feedchart',
          partial_composition: true,
          feed_only: true,
          ab_part_b_per_part_a: 1,
        },
        lines: [],
      }),
    );
  }

  return {
    sources,
    newProducts: newProducts.filter(
      (p) => p.lines.length > 0 || p.metadata.partial_composition === true || p.metadata.feed_only === true,
    ),
    productPatches,
    deleteProductExternalKeys: [],
    feedSchedules,
    aliasRows: [],
    targetProfiles,
    metadataPatches,
  };
}

export function mergeP5IntoBundle(
  bundle: {
    sources: Array<Record<string, unknown>>;
    fertilizers: Array<Record<string, unknown>>;
    feed_schedules: Array<Record<string, unknown>>;
    target_profiles: Array<Record<string, unknown>>;
    counts: Record<string, number>;
  },
) {
  const model = buildP5ImportModel();

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

  for (const patch of model.productPatches) {
    const p = bundle.fertilizers.find((f) => f.external_key === patch.external_key);
    if (!p) continue;
    if (patch.physical_form) p.physical_form = patch.physical_form;
    if (patch.dose_unit) p.dose_unit = patch.dose_unit;
    p.source_id = patch.source_id;
    p.trust_level = patch.trust_level;
    p.verification_status = patch.verification_status;
    p.retrieved_at = patch.retrieved_at;
    p.metadata = { ...(p.metadata as object), ...patch.metadata };
    if (patch.lines.length > 0) {
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

  for (const mp of model.metadataPatches) {
    const p = bundle.fertilizers.find((f) => f.external_key === mp.external_key);
    if (!p) continue;
    p.metadata = { ...(p.metadata as object), ...mp.metadata };
    p.source_id = mp.source_id;
    p.retrieved_at = mp.retrieved_at;
  }

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

  for (const sched of model.feedSchedules) {
    if (bundle.feed_schedules.some((s) => s.slug === sched.slug)) continue;
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

  for (const tp of model.targetProfiles) {
    if (bundle.target_profiles.some((p) => p.slug === tp.slug)) continue;
    bundle.target_profiles.push({
      id: tp.id,
      slug: tp.slug,
      name: tp.name,
      stage: tp.stage,
      target_ppm: tp.target_ppm,
      source_id: tp.source_id,
      citation: tp.citation,
      url: tp.url,
      license: tp.license,
      retrieved_at: tp.retrieved_at,
      trust_level: tp.trust_level,
      verification_status: tp.verification_status,
      metadata: tp.metadata,
    });
  }

  bundle.counts.fertilizers = bundle.fertilizers.length;
  if (bundle.counts.target_profiles != null) {
    bundle.counts.target_profiles = bundle.target_profiles.length;
  }
}
