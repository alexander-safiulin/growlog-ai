import type { SolveForwardResult } from '@growlog/nutrient-calc';

export function solutionDoseFingerprint(result: SolveForwardResult | null | undefined): string {
  if (!result?.best?.doses) return '';
  return result.best.doses
    .filter((d) => d.amountPerL > 0)
    .map((d) => `${d.fertilizerId}:${(Math.round(d.amountPerL * 10000) / 10000).toFixed(4)}`)
    .sort()
    .join('|');
}

export type WandWorkspaceFingerprintInput = {
  selectedIds: string[];
  profileSlug: string;
  volumeL: number;
  tankMode: string;
  stockFactor: number;
  model: string;
  waterProfileId: string;
  systemStepId: string;
  doseFingerprint: string;
};

/** Clear saved recipe id when solver inputs change; keep it across benign reloads. */
export function savedRecipeIdAfterFingerprintChange(
  previousFingerprint: string | null,
  nextFingerprint: string,
  savedRecipeId: string | null,
): string | null {
  if (previousFingerprint !== null && previousFingerprint !== nextFingerprint) {
    return null;
  }
  return savedRecipeId;
}

export function wandWorkspaceFingerprint(input: WandWorkspaceFingerprintInput): string {
  const ids = [...input.selectedIds].sort();
  return JSON.stringify({
    ids,
    profileSlug: input.profileSlug,
    volumeL: input.volumeL,
    tankMode: input.tankMode,
    stockFactor: input.stockFactor,
    model: input.model,
    waterProfileId: input.waterProfileId,
    systemStepId: input.systemStepId,
    doseFingerprint: input.doseFingerprint,
  });
}
