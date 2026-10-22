/** Client-side catalog shape (from adr014-catalog.bundle.json). */
export interface CatalogBundle {
  version: number;
  sources: Array<{
    id: string;
    slug: string;
    name: string;
    citation?: string;
    url?: string;
    license?: string;
    retrieved_at: string;
    trust_level: string;
    verification_status?: string;
    notes?: Record<string, unknown>;
  }>;
  fertilizers: Array<{
    id: string;
    external_key: string;
    brand: string;
    name: string;
    physical_form: 'solid' | 'liquid';
    dose_unit: 'g_per_L' | 'ml_per_L';
    source_id: string;
    trust_level: string;
    metadata?: Record<string, unknown>;
    lines: Array<{ form_key: string; value_pct: number }>;
  }>;
  target_profiles: Array<{
    id: string;
    slug: string;
    name: string;
    target_ppm: Record<string, number>;
    overdose_pct?: Record<string, number>;
    source_id: string;
  }>;
  feed_schedules?: Array<{
    slug: string;
    name: string;
    manufacturer?: string;
    source_id: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface ManufacturerManifestP4 {
  imported: Array<{
    slug: string;
    name: string;
    provenance_class: string;
    url?: string;
    notes?: string;
  }>;
  missing: Array<{ manufacturer: string; reason: string }>;
}
