import type { DoseRowState, RecipeDoseLine } from './feeding-doses';
import { dosesFromRecipeLines } from './feeding-doses';

export type SolutionSnapshotDosePerL = {
  product_label: string;
  dose_per_l: number;
  unit: 'g_per_L' | 'ml_per_L' | string;
  tank: string;
  fertilizer_product_id?: string | null;
  farm_fertilizer_product_id?: string | null;
};

export type FeedingSolutionSnapshot = {
  recipe_id: string;
  name: string | null;
  solution_kind: string | null;
  doses_per_l: SolutionSnapshotDosePerL[];
  elements_mg_per_l: Record<string, number> | null;
  ec_ms_calculated: number | null;
};

export function appliedElementsMg(
  snapshot: Pick<FeedingSolutionSnapshot, 'elements_mg_per_l'>,
  volumeMl: number,
): Record<string, number> | null {
  const ppm = snapshot.elements_mg_per_l;
  if (!ppm || volumeMl <= 0) return null;
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(ppm)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) continue;
    out[key] = (val * volumeMl) / 1000;
  }
  return Object.keys(out).length ? out : null;
}

function parseSolverAchieved(inputs: Record<string, unknown>): {
  elements: Record<string, number> | null;
  ec: number | null;
  doses: SolutionSnapshotDosePerL[];
} {
  const raw = inputs._solverResult;
  if (!raw || typeof raw !== 'object') return { elements: null, ec: null, doses: [] };
  const best = (
    raw as {
      best?: {
        achievedPpm?: Record<string, number>;
        ecEstimateMsCm?: number;
        doses?: Array<{
          fertilizerName?: string;
          amountPerL?: number;
          fertilizerId?: string;
          unit?: string;
          tank?: string;
        }>;
      };
    }
  ).best;
  if (!best) return { elements: null, ec: null, doses: [] };
  const elements =
    best.achievedPpm && typeof best.achievedPpm === 'object'
      ? (best.achievedPpm as Record<string, number>)
      : null;
  const ec =
    typeof best.ecEstimateMsCm === 'number' && Number.isFinite(best.ecEstimateMsCm)
      ? best.ecEstimateMsCm
      : null;
  const doses: SolutionSnapshotDosePerL[] = (best.doses ?? []).flatMap((d) => {
    if (typeof d.amountPerL !== 'number' || !d.fertilizerName) return [];
    const fid = d.fertilizerId ?? '';
    return [
      {
        product_label: d.fertilizerName,
        dose_per_l: d.amountPerL,
        unit: d.unit === 'ml_per_L' ? 'ml_per_L' : 'g_per_L',
        tank: d.tank === 'a' || d.tank === 'b' ? d.tank : 'single',
        fertilizer_product_id: fid.startsWith('farm:') ? null : fid || null,
        farm_fertilizer_product_id: fid.startsWith('farm:') ? fid.slice('farm:'.length) : null,
      },
    ];
  });
  return { elements, ec, doses };
}

export function buildGuestSolutionSnapshot(params: {
  recipeId: string;
  name: string;
  solutionKind: string;
  inputs: Record<string, unknown>;
  includeComposition: boolean;
  dosesPerL?: SolutionSnapshotDosePerL[];
}): FeedingSolutionSnapshot {
  const { elements, ec, doses } = parseSolverAchieved(params.inputs);
  return {
    recipe_id: params.recipeId,
    name: params.name,
    solution_kind: params.solutionKind,
    doses_per_l: params.dosesPerL ?? doses,
    elements_mg_per_l: params.includeComposition ? elements : null,
    ec_ms_calculated: params.includeComposition ? ec : null,
  };
}

export function buildCloudRecipeSnapshotFromRow(params: {
  recipeId: string;
  name: string | null;
  solutionKind: string | null;
  result: Record<string, unknown>;
  dosesPerL: SolutionSnapshotDosePerL[];
  includeComposition: boolean;
}): FeedingSolutionSnapshot {
  const best = params.result?.best as
    | { achievedPpm?: Record<string, number>; ecEstimateMsCm?: number }
    | undefined;
  const elements =
    params.includeComposition && best?.achievedPpm && typeof best.achievedPpm === 'object'
      ? best.achievedPpm
      : null;
  const ec =
    params.includeComposition &&
    typeof best?.ecEstimateMsCm === 'number' &&
    Number.isFinite(best.ecEstimateMsCm)
      ? best.ecEstimateMsCm
      : null;
  return {
    recipe_id: params.recipeId,
    name: params.name,
    solution_kind: params.solutionKind,
    doses_per_l: params.dosesPerL,
    elements_mg_per_l: elements,
    ec_ms_calculated: ec,
  };
}

const DOSE_MATCH_TOLERANCE_ML = 0.15;

function parseAmountMl(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function doseRowKey(d: {
  productLabel?: string;
  product_label?: string;
  fertilizerProductId?: string | null;
  farmFertilizerProductId?: string | null;
  fertilizer_product_id?: string | null;
  farm_fertilizer_product_id?: string | null;
}): string {
  const fp = d.fertilizerProductId ?? d.fertilizer_product_id;
  const ffp = d.farmFertilizerProductId ?? d.farm_fertilizer_product_id;
  if (fp) return `cat:${fp}`;
  if (ffp) return `farm:${ffp}`;
  const label = (d.productLabel ?? d.product_label ?? '').trim().toLowerCase();
  return `label:${label}`;
}

export function feedingDosesMatchRecipe(
  submitted: DoseRowState[],
  recipeLines: RecipeDoseLine[],
  volumeMl: number,
  recipeVolumeL: number | null,
): boolean {
  if (!recipeLines.length) return submitted.length === 0;
  const expected = dosesFromRecipeLines(recipeLines, volumeMl, recipeVolumeL);
  if (expected.length !== submitted.length) return false;
  const byKey = new Map<string, DoseRowState>();
  for (const row of submitted) byKey.set(doseRowKey(row), row);
  for (const exp of expected) {
    const got = byKey.get(doseRowKey(exp));
    if (!got) return false;
    const a = parseAmountMl(got.amountMl);
    const b = parseAmountMl(exp.amountMl);
    if (a == null || b == null) return false;
    if (Math.abs(a - b) > DOSE_MATCH_TOLERANCE_ML) return false;
  }
  return true;
}
