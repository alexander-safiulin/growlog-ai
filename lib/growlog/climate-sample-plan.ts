import {
  normalizeTuyaNumeric,
  type TuyaStatusDevice,
  type VpdSourceAssignment,
} from '@growlog/domain';

export const CLIMATE_SAMPLE_INTERVAL_MS = 15 * 60 * 1000;
export const CLIMATE_SAMPLE_MIN_GAP_MS = 10 * 60 * 1000;

const PLACE_SCOPE_TYPES = new Set(['site', 'room', 'tent', 'zone']);

export type ClimateSampleMetric = 'temp_air' | 'rh';

export type ClimateSamplePoint = {
  metricCode: ClimateSampleMetric;
  unit: string;
  value: number;
  deviceId: string;
  statusCode: string;
};

export type ScopeCandidate = {
  id: string;
  zoneId: string | null;
  scopeType: string;
  active: boolean;
};

export function climateSamplesFromAssignment(
  assignment: VpdSourceAssignment | null | undefined,
  devices: TuyaStatusDevice[]
): ClimateSamplePoint[] {
  if (!assignment) return [];
  const out: ClimateSamplePoint[] = [];
  const air = readingForRef(assignment.airTemp, devices, 'temp');
  if (air != null && assignment.airTemp) {
    out.push({
      metricCode: 'temp_air',
      unit: '°C',
      value: air,
      deviceId: assignment.airTemp.deviceId,
      statusCode: assignment.airTemp.code,
    });
  }
  const rh = readingForRef(assignment.rh, devices, 'rh');
  if (rh != null && assignment.rh) {
    out.push({
      metricCode: 'rh',
      unit: '%',
      value: rh,
      deviceId: assignment.rh.deviceId,
      statusCode: assignment.rh.code,
    });
  }
  return out;
}

function readingForRef(
  ref: VpdSourceAssignment['airTemp'],
  devices: TuyaStatusDevice[],
  kind: 'temp' | 'rh'
): number | null {
  if (!ref?.deviceId || !ref.code) return null;
  const device = devices.find((d) => d.id === ref.deviceId);
  const point = device?.status?.find((s) => s.code === ref.code);
  if (!point) return null;
  const value = normalizeTuyaNumeric(ref.code, point.value);
  if (value == null) return null;
  if (kind === 'rh' && (value < 0 || value > 100)) return null;
  return value;
}

export function resolveClimateSampleScope(
  scopes: ScopeCandidate[],
  zoneId: string | null
): { scopeId: string } | { skip: 'no_scope' | 'ambiguous_room' } {
  const active = scopes.filter((s) => s.active);
  if (zoneId) {
    const inZone = active.filter((s) => s.zoneId === zoneId);
    const places = inZone.filter((s) => PLACE_SCOPE_TYPES.has(s.scopeType));
    const pool = places.length ? places : inZone;
    if (pool.length === 1) return { scopeId: pool[0].id };
    if (pool.length === 0) return { skip: 'no_scope' };
    return { skip: 'ambiguous_room' };
  }
  const places = active.filter((s) => PLACE_SCOPE_TYPES.has(s.scopeType));
  if (places.length === 1) return { scopeId: places[0].id };
  if (places.length > 1) return { skip: 'ambiguous_room' };
  if (active.length === 1) return { scopeId: active[0].id };
  if (active.length === 0) return { skip: 'no_scope' };
  return { skip: 'ambiguous_room' };
}

export function unloadedPlaceScopes(
  scopes: ScopeCandidate[],
  selectedScopeId: string | null,
  names: Map<string, string>
): { id: string; displayName: string }[] {
  if (!selectedScopeId) return [];
  return scopes
    .filter(
      (s) =>
        s.active &&
        s.id !== selectedScopeId &&
        PLACE_SCOPE_TYPES.has(s.scopeType)
    )
    .map((s) => ({
      id: s.id,
      displayName: names.get(s.id)?.trim() || s.scopeType,
    }));
}
