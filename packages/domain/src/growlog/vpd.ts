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

export type VpdSourceAssignment = {
  airTemp: ClimatePointRef | null;
  leafTemp: ClimatePointRef | null;
  rh: ClimatePointRef | null;
};

export type GrowCycleStageForVpd =
  | 'propagation'
  | 'veg'
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
  flower: { minKpa: 1.2, maxKpa: 1.6, label: '1.2–1.6' },
};

export function saturationVaporPressureKpa(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

export function computeVpdKpa(input: {
  airTempC: number;
  rhPct: number;
  leafTempC?: number | null;
}): number {
  const rh = Math.min(100, Math.max(0, input.rhPct));
  const svpAir = saturationVaporPressureKpa(input.airTempC);
  if (input.leafTempC != null && Number.isFinite(input.leafTempC)) {
    const svpLeaf = saturationVaporPressureKpa(input.leafTempC);
    return Math.max(0, svpLeaf - (svpAir * rh) / 100);
  }
  return Math.max(0, svpAir * (1 - rh / 100));
}

export function vpdBandForStage(stage: string | null | undefined): VpdBand | null {
  if (!stage) return null;
  return STAGE_BANDS[stage as GrowCycleStageForVpd] ?? null;
}

export function vpdBandStatus(vpdKpa: number, band: VpdBand | null): VpdBandStatus {
  if (!band) return 'none';
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

export function normalizeTuyaNumeric(code: string, raw: string | number | boolean): number | null {
  if (typeof raw === 'boolean') return null;
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else {
    const trimmed = raw.trim();
    if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
    n = Number(trimmed);
  }
  if (!Number.isFinite(n)) return null;
  if (isTempCode(code)) {
    if (Math.abs(n) > 80) return n / 10;
    return n;
  }
  if (isRhCode(code)) {
    if (n > 100) return n / 10;
    return n;
  }
  return null;
}

export type TuyaStatusDevice = {
  id: string;
  name: string;
  status: { code: string; value: string | number | boolean }[];
};

export function parseClimatePointsFromDevices(devices: TuyaStatusDevice[]): ParsedClimatePoint[] {
  const out: ParsedClimatePoint[] = [];
  for (const device of devices) {
    for (const point of device.status) {
      const code = point.code;
      if (!isTempCode(code) && !isRhCode(code)) continue;
      const normalized = normalizeTuyaNumeric(code, point.value);
      if (normalized == null) continue;
      const base: ParsedClimatePoint = {
        deviceId: device.id,
        deviceName: device.name,
        code,
        kind: isRhCode(code) ? 'rh' : 'temp',
      };
      if (base.kind === 'rh') {
        out.push({ ...base, valueRhPct: normalized });
      } else {
        out.push({ ...base, valueCelsius: normalized });
      }
    }
  }
  return out;
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
