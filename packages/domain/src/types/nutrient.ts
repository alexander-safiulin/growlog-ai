/** ADR-014 nutrient catalog / recipe tables (matches supabase migrations). */

export type NutrientTrustLevel = 'high' | 'medium' | 'low' | 'unverified';
export type NutrientVerificationStatus =
  | 'verified'
  | 'spot_checked'
  | 'unverified'
  | 'known_error';

export interface NutrientDataSource {
  id: string;
  slug: string;
  name: string;
  source_type: string;
  citation: string | null;
  url: string | null;
  license: string | null;
  retrieved_at: string;
  verification_status: NutrientVerificationStatus;
  trust_level: NutrientTrustLevel;
  notes: Record<string, unknown>;
}

export interface FertilizerProductRow {
  id: string;
  external_key: string;
  brand: string;
  name: string;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  is_custom: boolean;
  farm_id: string | null;
  source_id: string;
  license: string | null;
  retrieved_at: string;
  trust_level: NutrientTrustLevel;
  verification_status: NutrientVerificationStatus;
  metadata: Record<string, unknown>;
}

export interface FertilizerCompositionLineRow {
  id: string;
  product_id: string;
  form_key: string;
  value_pct: number;
  source_id: string;
  trust_level: NutrientTrustLevel;
}

export interface TargetSolutionProfileRow {
  id: string;
  slug: string;
  name: string;
  stage: string | null;
  target_ppm: Record<string, number>;
  overdose_pct: Record<string, number>;
  source_id: string;
  citation: string | null;
  trust_level: NutrientTrustLevel;
}

export interface NutrientRecipeRow {
  id: string;
  farm_id: string;
  cycle_id: string | null;
  scope_id: string | null;
  mode: 'forward' | 'reverse';
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  solver_version: string | null;
}
