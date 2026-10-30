import type { GrowCycleStage } from './cycle-tracking';

/** Subtle stage band tints for calendar cells (light theme baseline). */
export const GROWER_STAGE_BAND_RGB: Record<GrowCycleStage, string> = {
  propagation: '34, 139, 87',
  cloning: '40, 130, 90',
  veg: '45, 106, 79',
  preflower: '82, 121, 111',
  flower: '183, 110, 55',
  drying: '139, 115, 85',
  curing: '107, 91, 115',
  completed: '90, 90, 90',
};

export function stageBandStyle(stage: GrowCycleStage | null, alpha = 0.14): string | undefined {
  if (!stage) return undefined;
  const rgb = GROWER_STAGE_BAND_RGB[stage];
  return `rgba(${rgb}, ${alpha})`;
}

/** Deterministic marker color for a fertilizer product (feeding drops). */
export function productMarkerColor(productKey: string): string {
  let hash = 0;
  for (let i = 0; i < productKey.length; i++) {
    hash = (hash * 31 + productKey.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 62% 42%)`;
}

export function productColorKey(params: {
  productLabel: string;
  fertilizerProductId?: string | null;
  farmFertilizerProductId?: string | null;
}): string {
  return params.farmFertilizerProductId ?? params.fertilizerProductId ?? params.productLabel;
}
