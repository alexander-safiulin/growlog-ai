import {
  estimateEcMsCm,
  solveReverse,
  type DoseUnit,
  type FertilizerSpec,
  type SolveSolution,
} from '@growlog/nutrient-calc';

const DOSE_EPS = 1e-4;

export type ManualDoseLine = SolveSolution['doses'][number] & {
  stockAmountPerL?: number;
};

export function doseLineKey(fertilizerId: string, tank?: string): string {
  const tankId = !tank || tank === 'single' ? 'single' : tank;
  return `${fertilizerId}:${tankId}`;
}

export function parseDoseDraft(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed || trimmed.endsWith('.') || (trimmed.match(/\./g)?.length ?? 0) > 1) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function isManualDose(original: number, edited: number): boolean {
  return Math.abs(original - edited) > DOSE_EPS;
}

function summedDoses(
  doses: ManualDoseLine[],
  specsById: ReadonlyMap<string, FertilizerSpec>,
): Map<string, { spec: FertilizerSpec; amount: number; unit: DoseUnit }> {
  const summed = new Map<string, { spec: FertilizerSpec; amount: number; unit: DoseUnit }>();
  for (const dose of doses) {
    if (dose.amountPerL <= 0) continue;
    const spec = specsById.get(dose.fertilizerId);
    if (!spec) continue;
    const prev = summed.get(dose.fertilizerId);
    summed.set(dose.fertilizerId, {
      spec,
      unit: dose.unit,
      amount: (prev?.amount ?? 0) + dose.amountPerL,
    });
  }
  return summed;
}

function mergeAchieved(
  displayed: Record<string, number>,
  baseline: Record<string, number>,
  edited: Record<string, number>,
): Record<string, number> {
  const keys = new Set([
    ...Object.keys(displayed),
    ...Object.keys(baseline),
    ...Object.keys(edited),
  ]);
  const out: Record<string, number> = {};
  for (const key of keys) {
    const value = (displayed[key] ?? 0) + ((edited[key] ?? 0) - (baseline[key] ?? 0));
    if (Math.abs(value) > 1e-9) out[key] = value;
  }
  return out;
}

/** Replace per-line doses and recompute tank totals, EC, and achieved ppm. Does not re-optimize. */
export function applyManualDoseAmounts(
  solution: SolveSolution,
  edits: Record<string, number>,
  specsById: ReadonlyMap<string, FertilizerSpec>,
  volumeL: number,
  model: 'canonical' | 'hydroodo_legacy' = 'canonical',
): SolveSolution {
  const original = solution.doses as ManualDoseLine[];
  let changed = false;
  const doses = original.map((dose) => {
    const next = edits[doseLineKey(dose.fertilizerId, dose.tank)];
    if (next == null || !Number.isFinite(next) || next < 0 || !isManualDose(dose.amountPerL, next)) {
      return dose;
    }
    changed = true;
    const ratio = dose.amountPerL > DOSE_EPS ? next / dose.amountPerL : 0;
    return {
      ...dose,
      amountPerL: next,
      amountTotal: volumeL > 0 ? next * volumeL : dose.amountTotal,
      stockAmountPerL:
        dose.stockAmountPerL != null && dose.amountPerL > DOSE_EPS
          ? dose.stockAmountPerL * ratio
          : dose.stockAmountPerL,
    };
  });
  if (!changed) return solution;

  const baseline = summedDoses(original, specsById);
  const edited = summedDoses(doses, specsById);
  if (edited.size === 0) {
    return { ...solution, doses };
  }

  const toInput = (rows: Map<string, { spec: FertilizerSpec; amount: number; unit: DoseUnit }>) =>
    [...rows.values()].map((row) => ({
      fertilizer: row.spec,
      amountPerL: row.amount,
      unit: row.unit,
    }));
  const editedPpm = solveReverse({ doses: toInput(edited), options: { model } }).achievedPpm as Record<
    string,
    number
  >;
  const achievedPpm =
    baseline.size === 0
      ? editedPpm
      : mergeAchieved(
          solution.achievedPpm as Record<string, number>,
          solveReverse({ doses: toInput(baseline), options: { model } }).achievedPpm as Record<string, number>,
          editedPpm,
        );

  return {
    ...solution,
    doses,
    achievedPpm,
    ecEstimateMsCm: estimateEcMsCm(achievedPpm, { legacyNAsNitrate: model === 'hydroodo_legacy' }),
  };
}
