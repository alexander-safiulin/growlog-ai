import type { SourceWaterProfile } from '@growlog/nutrient-calc';

export interface FullWaterProfileInput {
  water_ppm: Record<string, number>;
  alkalinity_hco3_ppm?: number | null;
  ec_ms_cm?: number | null;
  ph?: number | null;
  alkalinityAsCaco3?: boolean;
}

/** Map stored farm water profile into solver source water (all supported ions). */
export function sourceWaterFromProfile(profile: FullWaterProfileInput): SourceWaterProfile & {
  ph?: number;
  ecMsCm?: number;
} {
  const ppm = { ...profile.water_ppm };
  if (ppm.HCO3 == null && profile.alkalinity_hco3_ppm != null) {
    ppm.HCO3 = profile.alkalinity_hco3_ppm;
  }
  return {
    ppm: {
      Ca: ppm.Ca ?? 0,
      Mg: ppm.Mg ?? 0,
      K: ppm.K ?? 0,
      Na: ppm.Na ?? 0,
      Cl: ppm.Cl ?? 0,
      N_NO3: ppm.N_NO3 ?? ppm.NO3 ?? 0,
      S: ppm.S ?? 0,
      SO4: ppm.SO4 ?? 0,
      ...ppm,
    },
    // HCO3 in water_ppm is already mg/L. Copying it into alkalinity would rescale it as CaCO3.
    alkalinityHco3Ppm: profile.alkalinity_hco3_ppm ?? 0,
    alkalinityAsCaco3Equivalent: profile.alkalinityAsCaco3 ?? true,
    ph: profile.ph ?? undefined,
    ecMsCm: profile.ec_ms_cm ?? undefined,
  };
}
