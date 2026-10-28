/**
 * Untargeted rows below this ppm are numerical dust.
 * 0.05 hid Mo: a normal micro dose lands around 0.005–0.05 ppm.
 */
export const UNTARGETED_ELEMENT_PPM_MIN = 0.0001;

export function nutrientPpmFractionDigits(value: number): number {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs >= 10) return 1;
  if (abs >= 0.1) return 2;
  if (abs >= 0.01) return 3;
  return 4;
}

function trimFractionZeros(text: string): string {
  return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/** ppm for the phone calculator. Keeps Mo (0.01) instead of rounding it to 0.0. */
export function formatNutrientPpm(value: number): string {
  if (!Number.isFinite(value)) return '–';
  return trimFractionZeros(value.toFixed(nutrientPpmFractionDigits(value)));
}

/** Elemental % in a product. Four decimals below 1% so 0.0008% Mo stays visible. */
export function formatNutrientPercent(value: number): string {
  if (!Number.isFinite(value)) return '–';
  const digits = Math.abs(value) >= 1 ? 2 : 4;
  return trimFractionZeros(value.toFixed(digits));
}

export function showNutrientElementRow(targetPpm: number, achievedPpm: number): boolean {
  if (targetPpm > 0) return true;
  return Number.isFinite(achievedPpm) && achievedPpm >= UNTARGETED_ELEMENT_PPM_MIN;
}
