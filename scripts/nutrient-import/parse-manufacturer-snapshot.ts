/**
 * Pure parsers for manufacturer snapshot JSON (unit-tested; no I/O).
 */

export type ProvenanceClass =
  | 'manufacturer_label'
  | 'manufacturer_feedchart'
  | 'hydroodo_legacy'
  | 'scientific'
  | 'community';

export interface SnapshotSource {
  slug: string;
  name: string;
  url?: string;
  citation?: string;
  license?: string;
  retrieved_at: string;
  provenance_class: ProvenanceClass;
  trust_level?: 'high' | 'medium' | 'low' | 'unverified';
  verification_status?: 'verified' | 'spot_checked' | 'unverified' | 'known_error';
}

export interface GheFloraSnapshot {
  schema_version: number;
  source: SnapshotSource;
  feed_schedule: {
    slug: string;
    name: string;
    manufacturer: string;
    steps: Array<{
      step_order: number;
      label: string;
      product_external_key: string;
      dose_per_l: number;
      unit: 'ml_per_L' | 'g_per_L';
    }>;
  };
  product_label_links: Array<{
    external_key: string;
    label_url: string;
    provenance_class: ProvenanceClass;
  }>;
}

export interface HydroBuddySaltsSnapshot {
  schema_version: number;
  source: SnapshotSource;
  salts: Array<{
    external_key: string;
    brand: string;
    name: string;
    physical_form: 'solid' | 'liquid';
    dose_unit: 'g_per_L' | 'ml_per_L';
    declared_pct: Record<string, number>;
    citation: string;
  }>;
}

export function parseGheFloraSnapshot(raw: unknown): GheFloraSnapshot {
  const o = raw as GheFloraSnapshot;
  if (o?.schema_version !== 1) throw new Error('ghe_snapshot: unsupported schema_version');
  if (!o.source?.slug || !o.feed_schedule?.slug) throw new Error('ghe_snapshot: missing source or feed_schedule');
  if (!Array.isArray(o.feed_schedule.steps) || o.feed_schedule.steps.length === 0) {
    throw new Error('ghe_snapshot: feed_schedule.steps required');
  }
  for (const s of o.feed_schedule.steps) {
    if (!s.product_external_key || s.dose_per_l < 0) {
      throw new Error(`ghe_snapshot: invalid step ${s.step_order}`);
    }
  }
  return o;
}

export function parseHydroBuddySaltsSnapshot(raw: unknown): HydroBuddySaltsSnapshot {
  const o = raw as HydroBuddySaltsSnapshot;
  if (o?.schema_version !== 1) throw new Error('hydrobuddy_snapshot: unsupported schema_version');
  if (!o.source?.slug) throw new Error('hydrobuddy_snapshot: missing source');
  if (!Array.isArray(o.salts)) throw new Error('hydrobuddy_snapshot: salts array required');
  for (const salt of o.salts) {
    if (!salt.external_key || !salt.declared_pct || Object.keys(salt.declared_pct).length === 0) {
      throw new Error(`hydrobuddy_snapshot: invalid salt ${salt.external_key ?? '?'}`);
    }
  }
  return o;
}
