import { DEFAULT_SOLVE_ELEMENTS, HYDROODO_OVERDOSE_DEFAULTS } from '@growlog/nutrient-calc';

const ACHIEVED_PPM_MIN = 1e-4;
const MACRO_PPM_MIN = 0.05;

/** Macros stay at 0.01 ppm. Traces use 0.0001 so Mo (often 0.01) is not stored as 0. */
function roundStoredPpm(value: number): number {
  const digits = Math.abs(value) >= 1 ? 2 : 4;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export const CUSTOM_TARGET_NAME_MAX = 80;

const ALLOWED_PPM_KEYS = new Set<string>([
  ...DEFAULT_SOLVE_ELEMENTS,
  'N',
  'N_UNKNOWN',
  'Co',
  'Na',
  'Cl',
  'Si',
]);

const MACRO_KEYS = new Set(['N', 'N_NO3', 'N_NH4', 'N_UREA', 'P', 'K', 'Ca', 'Mg', 'S']);

export function normalizeCustomTargetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, CUSTOM_TARGET_NAME_MAX);
}

/** Solver achieved ppm → stored target profile (known elements, positive amounts). */
export function targetPpmFromAchievedSolution(
  achieved: Record<string, number> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!achieved || typeof achieved !== 'object') return out;
  for (const [key, raw] of Object.entries(achieved)) {
    if (!ALLOWED_PPM_KEYS.has(key)) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < ACHIEVED_PPM_MIN) continue;
    out[key] = roundStoredPpm(value);
  }
  return out;
}

/** A saved target needs at least one macro. Trace-only dust is not a tank goal. */
export function hasUsableTargetPpm(targetPpm: Record<string, number> | null | undefined): boolean {
  if (!targetPpm) return false;
  for (const [key, raw] of Object.entries(targetPpm)) {
    if (!MACRO_KEYS.has(key)) continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= MACRO_PPM_MIN) return true;
  }
  return false;
}

/** Hydroodo overdose caps as catalog-style percent (NPK 20%, Ca/Mg/S 30%, micro 50%). */
export function defaultCustomTargetOverdosePct(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, fraction] of Object.entries(HYDROODO_OVERDOSE_DEFAULTS)) {
    if (fraction == null) continue;
    out[key] = Math.round(fraction * 100);
  }
  if (out.N_NO3 != null && out.N == null) out.N = out.N_NO3;
  return out;
}
