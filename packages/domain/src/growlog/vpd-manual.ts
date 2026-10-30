import { VPD_LEAF_AIR_OFFSET_C } from './vpd-climate';
import { type ClimatePreviewField } from './vpd';

/** Room climate the grower typed. The card keeps the latest values; each change is also a journal event. */
export type ManualClimateReading = {
  airTempC: number;
  rhPct: number;
  /** Null keeps leaf temperature as air − 2 °C. */
  leafTempC: number | null;
};

const STAGE_DEFAULTS: Record<string, { airTempC: number; rhPct: number }> = {
  propagation: { airTempC: 24, rhPct: 70 },
  cloning: { airTempC: 24, rhPct: 70 },
  veg: { airTempC: 25, rhPct: 60 },
  preflower: { airTempC: 25, rhPct: 55 },
  flower: { airTempC: 26, rhPct: 50 },
  drying: { airTempC: 18, rhPct: 55 },
  curing: { airTempC: 18, rhPct: 62 },
};

const FALLBACK_STAGE = 'veg';

export function defaultManualClimate(stage: string | null | undefined): ManualClimateReading {
  const picked = (stage && STAGE_DEFAULTS[stage]) || STAGE_DEFAULTS[FALLBACK_STAGE]!;
  return { airTempC: picked.airTempC, rhPct: picked.rhPct, leafTempC: null };
}

export function resolveManualLeafTempC(reading: ManualClimateReading): number {
  if (reading.leafTempC != null) return reading.leafTempC;
  return reading.airTempC - VPD_LEAF_AIR_OFFSET_C;
}

export function applyManualClimateEdit(
  current: ManualClimateReading,
  field: ClimatePreviewField,
  parsed: number | 'clear'
): ManualClimateReading {
  if (field === 'leafTempC') {
    const leafTempC = parsed === 'clear' ? null : parsed;
    if (leafTempC === current.leafTempC) return current;
    return { ...current, leafTempC };
  }
  if (parsed === 'clear' || parsed === current[field]) return current;
  return { ...current, [field]: parsed };
}

export type ManualClimateJournalLabels = {
  air: string;
  humidity: string;
  leaf: string;
  vpd: string;
};

function formatRoomNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** One journal line for a manual room change. `occurred_at` stays on the event, not in the payload. */
export function formatManualClimateJournal(input: {
  reading: ManualClimateReading;
  field: ClimatePreviewField;
  vpdKpa: number | null;
  labels: ManualClimateJournalLabels;
}): { body: string; payload: Record<string, unknown> } {
  const leafTempC = resolveManualLeafTempC(input.reading);
  const leafEstimated = input.reading.leafTempC == null;
  const leaf = leafEstimated
    ? `${input.labels.leaf} ~${formatRoomNumber(leafTempC)} °C`
    : `${input.labels.leaf} ${formatRoomNumber(leafTempC)} °C`;
  const vpd =
    input.vpdKpa == null
      ? `${input.labels.vpd} —`
      : `${input.labels.vpd} ${input.vpdKpa.toFixed(2)} kPa`;
  const body = [
    `${input.labels.air} ${formatRoomNumber(input.reading.airTempC)} °C`,
    `${input.labels.humidity} ${formatRoomNumber(input.reading.rhPct)}%`,
    leaf,
    vpd,
  ].join(' · ');
  return {
    body,
    payload: {
      manual_climate: true,
      field: input.field,
      air_temp_c: input.reading.airTempC,
      air_rh_pct: input.reading.rhPct,
      leaf_temp_c: leafEstimated ? null : input.reading.leafTempC,
      leaf_estimated: leafEstimated,
      vpd_kpa: input.vpdKpa,
    },
  };
}

export function parseManualClimate(raw: unknown): ManualClimateReading | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const airTempC = typeof record.airTempC === 'number' ? record.airTempC : Number.NaN;
  const rhPct = typeof record.rhPct === 'number' ? record.rhPct : Number.NaN;
  if (!Number.isFinite(airTempC) || airTempC < -40 || airTempC > 80) return null;
  if (!Number.isFinite(rhPct) || rhPct < 0 || rhPct > 100) return null;
  if (record.leafTempC == null) return { airTempC, rhPct, leafTempC: null };
  const leafTempC = typeof record.leafTempC === 'number' ? record.leafTempC : Number.NaN;
  if (!Number.isFinite(leafTempC) || leafTempC < -40 || leafTempC > 80) return null;
  return { airTempC, rhPct, leafTempC };
}
