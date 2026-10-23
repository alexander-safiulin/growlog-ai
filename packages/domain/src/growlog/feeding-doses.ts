export type DoseRowState = {
  productLabel: string;
  amountMl: string;
  fertilizerProductId?: string | null;
  farmFertilizerProductId?: string | null;
  /** When true, amount rescales with volume changes. */
  autoScaled: boolean;
};

export type RecipeDoseLine = {
  fertilizer_label: string;
  dose_per_l: number;
  fertilizer_product_id: string | null;
  farm_fertilizer_product_id: string | null;
};

export function dosesFromRecipeLines(
  lines: RecipeDoseLine[],
  volumeMl: number,
  recipeVolumeL: number | null,
): DoseRowState[] {
  const baseL = recipeVolumeL && recipeVolumeL > 0 ? recipeVolumeL : 1;
  const factor = volumeMl / (baseL * 1000);
  return lines.map((r) => ({
    productLabel: r.fertilizer_label,
    amountMl: String(roundMl(r.dose_per_l * factor * 1000)),
    fertilizerProductId: r.fertilizer_product_id,
    farmFertilizerProductId: r.farm_fertilizer_product_id,
    autoScaled: true,
  }));
}

export function rescaleAutoDoses(
  doses: DoseRowState[],
  prevVolumeMl: number,
  nextVolumeMl: number,
): DoseRowState[] {
  if (!prevVolumeMl || prevVolumeMl <= 0 || prevVolumeMl === nextVolumeMl) return doses;
  const ratio = nextVolumeMl / prevVolumeMl;
  return doses.map((d) => {
    if (!d.autoScaled) return d;
    const n = parseFloat(d.amountMl.replace(',', '.'));
    if (!Number.isFinite(n)) return d;
    return { ...d, amountMl: String(roundMl(n * ratio)) };
  });
}

function roundMl(n: number): number {
  return Math.round(n * 100) / 100;
}
