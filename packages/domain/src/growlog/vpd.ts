export const TUYA_TEMP_CODES = ['va_temperature', 'temp_current', 'temperature'] as const;
export const TUYA_RH_CODES = ['va_humidity', 'humidity_value', 'humidity'] as const;

export type ClimatePointKind = 'air_temp' | 'leaf_temp' | 'rh';

export type ClimatePointRef = {
  deviceId: string;
  deviceName: string;
  code: string;
};

export type ParsedClimatePoint = ClimatePointRef & {
  kind: 'temp' | 'rh';
  valueCelsius?: number;
  valueRhPct?: number;
};

export type ClimatePreview = {
  airTempC?: number;
  leafTempC?: number;
  rhPct?: number;
};

export type ClimatePreviewField = keyof ClimatePreview;

export type VpdSourceAssignment = {
  airTemp: ClimatePointRef | null;
  leafTemp: ClimatePointRef | null;
  rh: ClimatePointRef | null;
};

export type GrowCycleStageForVpd =
  | 'propagation'
  | 'veg'
  | 'preflower'
  | 'flower'
  | 'drying'
  | 'curing'
  | 'completed';

export type VpdBand = {
  minKpa: number;
  maxKpa: number;
  label: string;
};

export type VpdBandStatus = 'below' | 'in_range' | 'above' | 'none';

const STAGE_BANDS: Partial<Record<GrowCycleStageForVpd, VpdBand>> = {
  propagation: { minKpa: 0.4, maxKpa: 0.8, label: '0.4–0.8' },
  veg: { minKpa: 0.8, maxKpa: 1.2, label: '0.8–1.2' },
  preflower: { minKpa: 1.0, maxKpa: 1.4, label: '1.0–1.4' },
  flower: { minKpa: 1.2, maxKpa: 1.6, label: '1.2–1.6' },
};

const TEMP_MIN_C = -40;
const TEMP_MAX_C = 80;

export function saturationVaporPressureKpa(tempC: number): number | null {
  if (!Number.isFinite(tempC) || tempC <= -237 || tempC > 100) return null;
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return Number.isFinite(svp) ? svp : null;
}

export function computeVpdKpa(input: {
  airTempC: number;
  rhPct: number;
  leafTempC?: number | null;
}): number | null {
  if (!Number.isFinite(input.airTempC) || !Number.isFinite(input.rhPct)) return null;
  if (input.airTempC < TEMP_MIN_C || input.airTempC > TEMP_MAX_C) return null;
  if (input.rhPct < 0 || input.rhPct > 100) return null;
  const svpAir = saturationVaporPressureKpa(input.airTempC);
  if (svpAir == null) return null;
  if (input.leafTempC != null) {
    if (!Number.isFinite(input.leafTempC)) return null;
    if (input.leafTempC < TEMP_MIN_C || input.leafTempC > TEMP_MAX_C) return null;
    const svpLeaf = saturationVaporPressureKpa(input.leafTempC);
    if (svpLeaf == null) return null;
    return Math.max(0, svpLeaf - (svpAir * input.rhPct) / 100);
  }
  return Math.max(0, svpAir * (1 - input.rhPct / 100));
}

export function vpdBandForStage(stage: string | null | undefined): VpdBand | null {
  if (!stage) return null;
  return STAGE_BANDS[stage as GrowCycleStageForVpd] ?? null;
}

export function vpdBandStatus(vpdKpa: number, band: VpdBand | null): VpdBandStatus {
  if (!band || !Number.isFinite(vpdKpa)) return 'none';
  if (vpdKpa < band.minKpa) return 'below';
  if (vpdKpa > band.maxKpa) return 'above';
  return 'in_range';
}

function pointKey(ref: Pick<ClimatePointRef, 'deviceId' | 'code'>): string {
  return `${ref.deviceId}:${ref.code}`;
}

export function refsEqual(
  a: ClimatePointRef | null | undefined,
  b: ClimatePointRef | null | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.deviceId === b.deviceId && a.code === b.code;
}

function isTempCode(code: string): boolean {
  return (TUYA_TEMP_CODES as readonly string[]).includes(code);
}

function isRhCode(code: string): boolean {
  return (TUYA_RH_CODES as readonly string[]).includes(code);
}

function scaleTemperature(raw: number): number | null {
  let value = raw;
  if (Math.abs(value) > 800) value = value / 100;
  else if (Math.abs(value) > 80) value = value / 10;
  if (value < TEMP_MIN_C || value > TEMP_MAX_C) return null;
  return value;
}

function scaleHumidity(raw: number): number | null {
  let value = raw;
  if (value > 1000) value = value / 100;
  else if (value > 100) value = value / 10;
  if (value < 0 || value > 100) return null;
  return value;
}

export function normalizeTuyaNumeric(code: string, raw: unknown): number | null {
  if (typeof raw === 'boolean' || raw == null) return null;
  const normalizedCode = code.trim();
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(',', '.');
    if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
    n = Number(trimmed);
  } else {
    return null;
  }
  if (!Number.isFinite(n)) return null;
  if (isTempCode(normalizedCode)) return scaleTemperature(n);
  if (isRhCode(normalizedCode)) return scaleHumidity(n);
  return null;
}

export type TuyaStatusDevice = {
  id: string;
  name: string;
  status: { code: string; value: string | number | boolean }[];
};

export function parseClimatePointsFromDevices(devices: TuyaStatusDevice[]): ParsedClimatePoint[] {
  if (!Array.isArray(devices)) return [];
  const byKey = new Map<string, ParsedClimatePoint>();
  for (const device of devices) {
    if (!device || typeof device.id !== 'string' || !device.id || !Array.isArray(device.status)) {
      continue;
    }
    for (const point of device.status) {
      if (!point || typeof point.code !== 'string') continue;
      const code = point.code.trim();
      if (!isTempCode(code) && !isRhCode(code)) continue;
      const normalized = normalizeTuyaNumeric(code, point.value);
      if (normalized == null) continue;
      const base: ParsedClimatePoint = {
        deviceId: device.id,
        deviceName: typeof device.name === 'string' && device.name.trim() ? device.name : device.id,
        code,
        kind: isRhCode(code) ? 'rh' : 'temp',
      };
      const parsed: ParsedClimatePoint =
        base.kind === 'rh'
          ? { ...base, valueRhPct: normalized }
          : { ...base, valueCelsius: normalized };
      byKey.set(pointKey(parsed), parsed);
    }
  }
  return [...byKey.values()];
}

export function defaultSourceAssignment(points: ParsedClimatePoint[]): VpdSourceAssignment {
  const temps = points.filter((p) => p.kind === 'temp');
  const rhs = points.filter((p) => p.kind === 'rh');
  const toRef = (p: ParsedClimatePoint): ClimatePointRef => ({
    deviceId: p.deviceId,
    deviceName: p.deviceName,
    code: p.code,
  });
  return {
    airTemp: temps.length === 1 ? toRef(temps[0]!) : null,
    leafTemp: null,
    rh: rhs.length === 1 ? toRef(rhs[0]!) : null,
  };
}

function isPointRef(value: unknown, kind: 'temp' | 'rh'): value is ClimatePointRef {
  if (!value || typeof value !== 'object') return false;
  const ref = value as ClimatePointRef;
  if (typeof ref.deviceId !== 'string' || !ref.deviceId.trim()) return false;
  if (typeof ref.code !== 'string' || !ref.code.trim()) return false;
  if (typeof ref.deviceName !== 'string') return false;
  const code = ref.code.trim();
  return kind === 'temp' ? isTempCode(code) : isRhCode(code);
}

function cleanRef(value: unknown, kind: 'temp' | 'rh'): ClimatePointRef | null {
  if (!isPointRef(value, kind)) return null;
  return {
    deviceId: value.deviceId.trim(),
    deviceName: value.deviceName,
    code: value.code.trim(),
  };
}

/** Drop broken refs and a leaf that points at the same status point as air. */
export function sanitizeAssignment(raw: unknown): VpdSourceAssignment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Partial<VpdSourceAssignment>;
  const airTemp = cleanRef(record.airTemp, 'temp');
  let leafTemp = cleanRef(record.leafTemp, 'temp');
  const rh = cleanRef(record.rh, 'rh');
  if (leafTemp && airTemp && refsEqual(leafTemp, airTemp)) leafTemp = null;
  return { airTemp, leafTemp, rh };
}

export function assignmentsEqual(a: VpdSourceAssignment, b: VpdSourceAssignment): boolean {
  return refsEqual(a.airTemp, b.airTemp) && refsEqual(a.leafTemp, b.leafTemp) && refsEqual(a.rh, b.rh);
}

/** Fill only empty slots. A saved leaf or air choice is never replaced by the single-point default. */
export function mergeAssignmentWithDefaults(
  prev: VpdSourceAssignment,
  points: ParsedClimatePoint[]
): VpdSourceAssignment {
  const clean = sanitizeAssignment(prev) ?? {
    airTemp: null,
    leafTemp: null,
    rh: null,
  };
  const defaults = defaultSourceAssignment(points);
  let leafTemp = clean.leafTemp ?? defaults.leafTemp;
  const airTemp = clean.airTemp ?? defaults.airTemp;
  if (leafTemp && airTemp && refsEqual(leafTemp, airTemp)) leafTemp = null;
  return {
    airTemp,
    leafTemp,
    rh: clean.rh ?? defaults.rh,
  };
}

const PREVIEW_NUMBER = /^-?\d+(\.\d*)?$/;

export function parseClimatePreviewInput(
  field: ClimatePreviewField,
  raw: string
): number | 'clear' | 'invalid' {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return 'clear';
  if (!PREVIEW_NUMBER.test(trimmed)) return 'invalid';
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return 'invalid';
  if (field === 'rhPct') {
    if (value < 0 || value > 100) return 'invalid';
    return value;
  }
  if (value < TEMP_MIN_C || value > TEMP_MAX_C) return 'invalid';
  return value;
}

export function applyClimatePreview(
  prev: ClimatePreview | null,
  field: ClimatePreviewField,
  parsed: number | 'clear',
  live: { airTempC: number | null; leafTempC: number | null; rhPct: number | null }
): ClimatePreview | null {
  const next: ClimatePreview = { ...(prev ?? {}) };
  if (parsed === 'clear' || parsed === live[field]) {
    delete next[field];
  } else {
    next[field] = parsed;
  }
  return next.airTempC != null || next.leafTempC != null || next.rhPct != null ? next : null;
}

export function resolveReadingFromAssignment(
  assignment: VpdSourceAssignment,
  points: ParsedClimatePoint[]
): {
  airTempC: number | null;
  leafTempC: number | null;
  rhPct: number | null;
  airLabel: string | null;
  leafLabel: string | null;
  rhLabel: string | null;
} {
  const find = (ref: ClimatePointRef | null, kind: 'temp' | 'rh'): ParsedClimatePoint | null => {
    if (!ref) return null;
    return (
      points.find(
        (p) => p.deviceId === ref.deviceId && p.code === ref.code && p.kind === kind
      ) ?? null
    );
  };

  const air = find(assignment.airTemp, 'temp');
  const leaf = find(assignment.leafTemp, 'temp');
  const rh = find(assignment.rh, 'rh');

  return {
    airTempC: air?.valueCelsius ?? null,
    leafTempC: leaf?.valueCelsius ?? null,
    rhPct: rh?.valueRhPct ?? null,
    airLabel: air ? air.deviceName : null,
    leafLabel: leaf ? leaf.deviceName : null,
    rhLabel: rh ? rh.deviceName : null,
  };
}

export function listSelectablePoints(
  points: ParsedClimatePoint[],
  kind: 'temp' | 'rh'
): ParsedClimatePoint[] {
  return points.filter((p) => p.kind === kind);
}

export function canAssignLeaf(
  candidate: ClimatePointRef,
  assignment: VpdSourceAssignment
): boolean {
  if (assignment.airTemp && pointKey(candidate) === pointKey(assignment.airTemp)) {
    return false;
  }
  return true;
}

export const VPD_PREVIEW_RESET_MS = 3000;

export function formatVpdDisplay(vpdKpa: number): string {
  return vpdKpa.toFixed(2);
}
