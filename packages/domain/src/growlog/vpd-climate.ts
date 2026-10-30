import {
  canAssignLeaf,
  refsEqual,
  TUYA_RH_CODES,
  TUYA_TEMP_CODES,
  type ClimatePointRef,
  type ParsedClimatePoint,
  type VpdSourceAssignment,
} from './vpd';

export const VPD_STALE_AFTER_MS = 3 * 60 * 60 * 1000;
export const VPD_LEAF_AIR_OFFSET_C = 2;
export const VPD_PICKER_SEARCH_MIN = 9;

export type VpdLeafMode = 'none' | 'sensor' | 'estimated';

export type VpdPersistedSources = {
  assignment: VpdSourceAssignment;
  leafMode: VpdLeafMode;
};

export type FarmZoneMeta = {
  id: string;
  name: string;
};

export type SensorDeviceMeta = {
  sensorDeviceId: string | null;
  zoneId: string | null;
  lastSeenAt: string | null;
  online: boolean;
  isInfrared: boolean;
  deviceLabel: string;
};

export type ClimateSensorIndexMeta = {
  sensorDeviceId: string | null;
  zoneId: string | null;
  lastSeenAt: string | null;
  isInfrared: boolean;
  readingAt?: string | null;
};

export function latestObservedAtIso(
  ...candidates: Array<string | null | undefined>
): string | null {
  let bestMs: number | null = null;
  let bestIso: string | null = null;
  for (const iso of candidates) {
    const ms = parseObservedAt(iso);
    if (ms == null) continue;
    if (bestMs == null || ms > bestMs) {
      bestMs = ms;
      bestIso = iso ?? null;
    }
  }
  return bestIso;
}

export type TuyaClimateDevice = {
  id: string;
  name: string;
  online: boolean;
  category: string | null;
  status: Array<{ code: string; value: string | number | boolean }>;
};

export type ClimateSourceRow = {
  ref: ClimatePointRef;
  kind: 'temp' | 'rh';
  deviceId: string;
  deviceName: string;
  zoneId: string | null;
  zoneName: string | null;
  online: boolean;
  observedAt: string | null;
  valueCelsius: number | null;
  valueRhPct: number | null;
  stale: boolean;
  usable: boolean;
  isInfrared: boolean;
};

const TEMP_CODE_PRIORITY: readonly string[] = [...TUYA_TEMP_CODES];
const RH_CODE_PRIORITY: readonly string[] = [...TUYA_RH_CODES];

const IR_CATEGORY_HINTS = ['wj', 'infrared', 'ir', 'infra'];

export function vpdStageLabelRu(stage: string | null | undefined): string {
  switch (stage) {
    case 'propagation':
      return 'рассада';
    case 'cloning':
      return 'клонирование';
    case 'veg':
      return 'вегетация';
    case 'preflower':
      return 'предцвет';
    case 'flower':
      return 'цветение';
    case 'drying':
      return 'сушка';
    case 'curing':
      return 'пролечка';
    case 'completed':
      return 'завершён';
    default:
      return stage?.trim() ? stage : 'цикл';
  }
}

export function resolveTuyaDeviceIdFromConfig(config: Record<string, unknown> | null): string | null {
  if (!config) return null;
  const keys = ['tuya_device_id', 'tuyaDeviceId', 'smartlife_device_id', 'smartlifeDeviceId', 'external_id'];
  for (const key of keys) {
    const v = config[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function isInfraredClimateDevice(input: {
  category: string | null;
  deviceType?: string | null;
  name?: string | null;
  config?: Record<string, unknown> | null;
}): boolean {
  const cfg = input.config;
  if (cfg && (cfg.is_infrared === true || cfg.isInfrared === true || cfg.ir_sensor === true)) {
    return true;
  }
  const cat = (input.category ?? '').toLowerCase();
  if (IR_CATEGORY_HINTS.some((h) => cat.includes(h))) return true;
  const dt = (input.deviceType ?? '').toLowerCase();
  if (dt.includes('ir') || dt.includes('infrared')) return true;
  const name = (input.name ?? '').toLowerCase();
  return name.includes('ir ') || name.includes('инфра') || name.includes('пиром');
}

function codePriority(kind: 'temp' | 'rh', code: string): number {
  const list = kind === 'temp' ? TEMP_CODE_PRIORITY : RH_CODE_PRIORITY;
  const idx = list.indexOf(code);
  return idx === -1 ? list.length : idx;
}

function pickPreferredPoint(points: ParsedClimatePoint[], kind: 'temp' | 'rh'): ParsedClimatePoint | null {
  const filtered = points.filter((p) => p.kind === kind);
  if (!filtered.length) return null;
  return [...filtered].sort((a, b) => codePriority(kind, a.code) - codePriority(kind, b.code))[0]!;
}

/** One Tuya device contributes at most one temp and one RH selectable source. */
export function dedupeClimatePointsByDevice(points: ParsedClimatePoint[]): ParsedClimatePoint[] {
  const byDevice = new Map<string, ParsedClimatePoint[]>();
  for (const p of points) {
    const list = byDevice.get(p.deviceId) ?? [];
    list.push(p);
    byDevice.set(p.deviceId, list);
  }
  const out: ParsedClimatePoint[] = [];
  for (const devicePoints of byDevice.values()) {
    const temp = pickPreferredPoint(devicePoints, 'temp');
    const rh = pickPreferredPoint(devicePoints, 'rh');
    if (temp) out.push(temp);
    if (rh) out.push(rh);
  }
  return out;
}

export function parseObservedAt(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function isClimateSourceStale(input: {
  online: boolean;
  observedAt: string | null;
  hasValue?: boolean;
  nowMs?: number;
}): boolean {
  const now = input.nowMs ?? Date.now();
  const seen = parseObservedAt(input.observedAt);
  if (seen != null) {
    return now - seen >= VPD_STALE_AFTER_MS;
  }
  if (input.online && input.hasValue) return false;
  return !input.online;
}

export function formatClimateValueRu(kind: 'temp' | 'rh', value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const formatted = value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return kind === 'temp' ? `${formatted} °C` : `${formatted} %`;
}

export function formatStaleLabelRu(observedAt: string | null, nowMs?: number): string {
  const now = nowMs ?? Date.now();
  const seen = parseObservedAt(observedAt);
  if (seen == null) return 'нет данных';
  const hours = Math.max(1, Math.round((now - seen) / (60 * 60 * 1000)));
  return `нет данных ${hours} ч`;
}

export function formatRelativeTimeRu(
  observedAt: string | null,
  nowMs?: number,
  options?: { online?: boolean }
): string {
  const now = nowMs ?? Date.now();
  const seen = parseObservedAt(observedAt);
  if (seen == null) {
    if (options?.online) return 'сейчас';
    return formatStaleLabelRu(null, now);
  }
  const diffSec = Math.max(0, Math.floor((now - seen) / 1000));
  if (diffSec < 45) return 'только что';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

export function buildSensorMetaIndex(
  devices: Array<{
    id: string;
    zone_id: string | null;
    last_seen_at: string | null;
    device_type: string | null;
    serial_number: string | null;
    config: Record<string, unknown> | null;
    name: string;
  }>
): Map<string, Omit<SensorDeviceMeta, 'deviceLabel' | 'online'>> {
  const index = new Map<string, Omit<SensorDeviceMeta, 'deviceLabel' | 'online'>>();
  for (const row of devices) {
    const meta = {
      sensorDeviceId: row.id,
      zoneId: row.zone_id ?? resolveDeviceZoneFromConfig(row.config),
      lastSeenAt: row.last_seen_at,
      isInfrared: isInfraredClimateDevice({
        category: null,
        deviceType: row.device_type,
        name: row.name,
        config: row.config,
      }),
    };
    index.set(row.id, meta);
    const tuyaId = resolveTuyaDeviceIdFromConfig(row.config) ?? row.serial_number?.trim() ?? null;
    if (tuyaId) index.set(tuyaId, meta);
  }
  return index;
}

function resolveDeviceZoneFromConfig(config: Record<string, unknown> | null): string | null {
  if (!config) return null;
  const z = config.zone_id ?? config.zoneId;
  return typeof z === 'string' && z.trim() ? z.trim() : null;
}

export function buildClimateSourceRows(input: {
  tuyaDevices: TuyaClimateDevice[];
  parsedPoints: ParsedClimatePoint[];
  sensorIndex: Map<string, ClimateSensorIndexMeta>;
  zones: FarmZoneMeta[];
  nowMs?: number;
}): ClimateSourceRow[] {
  const zoneName = new Map(input.zones.map((z) => [z.id, z.name]));
  const deduped = dedupeClimatePointsByDevice(input.parsedPoints);
  const rows: ClimateSourceRow[] = [];
  for (const point of deduped) {
    const tuya = input.tuyaDevices.find((d) => d.id === point.deviceId);
    const meta = input.sensorIndex.get(point.deviceId);
    const online = tuya?.online ?? false;
    const observedAt = latestObservedAtIso(meta?.lastSeenAt, meta?.readingAt);
    const stale = isClimateSourceStale({
      online,
      observedAt,
      hasValue: point.kind === 'temp' ? point.valueCelsius != null : point.valueRhPct != null,
      nowMs: input.nowMs,
    });
    const hasValue =
      point.kind === 'temp' ? point.valueCelsius != null : point.valueRhPct != null;
    const usable = hasValue && !stale;
    const zoneId = meta?.zoneId ?? null;
    rows.push({
      ref: { deviceId: point.deviceId, deviceName: point.deviceName, code: point.code },
      kind: point.kind,
      deviceId: point.deviceId,
      deviceName: point.deviceName,
      zoneId,
      zoneName: zoneId ? zoneName.get(zoneId) ?? null : null,
      online,
      observedAt,
      valueCelsius: point.valueCelsius ?? null,
      valueRhPct: point.valueRhPct ?? null,
      stale,
      usable,
      isInfrared:
        meta?.isInfrared ??
        isInfraredClimateDevice({
          category: tuya?.category ?? null,
          name: point.deviceName,
        }),
    });
  }
  return rows;
}

function freshnessMs(row: ClimateSourceRow): number {
  return parseObservedAt(row.observedAt) ?? 0;
}

function comparePickerRows(a: ClimateSourceRow, b: ClimateSourceRow): number {
  if (a.online !== b.online) return a.online ? -1 : 1;
  const fa = freshnessMs(a);
  const fb = freshnessMs(b);
  if (fa !== fb) return fb - fa;
  return a.deviceName.localeCompare(b.deviceName, 'ru');
}

export type ClimatePickerGroup = {
  zoneId: string | null;
  title: string;
  rows: ClimateSourceRow[];
};

export function groupClimatePickerRows(input: {
  rows: ClimateSourceRow[];
  kind: 'temp' | 'rh';
  cycleZoneId: string | null;
  leafOnly?: boolean;
  airAssignment?: ClimatePointRef | null;
}): ClimatePickerGroup[] {
  const filtered = input.rows
    .filter((r) => r.kind === input.kind)
    .filter((r) => {
      if (!input.leafOnly) return true;
      if (r.kind !== 'temp') return false;
      if (!input.airAssignment) return true;
      return canAssignLeaf(r.ref, {
        airTemp: input.airAssignment,
        leafTemp: null,
        rh: null,
      });
    });

  const byZone = new Map<string | null, ClimateSourceRow[]>();
  for (const row of filtered) {
    const key = row.zoneId;
    const list = byZone.get(key) ?? [];
    list.push(row);
    byZone.set(key, list);
  }

  const groups: ClimatePickerGroup[] = [];
  const cycleZoneId = input.cycleZoneId;

  const pushGroup = (zoneId: string | null, title: string) => {
    const rows = byZone.get(zoneId);
    if (!rows?.length) return;
    const sorted = [...rows].sort((a, b) => {
      if (input.leafOnly && a.isInfrared !== b.isInfrared) return a.isInfrared ? -1 : 1;
      return comparePickerRows(a, b);
    });
    groups.push({ zoneId, title, rows: sorted });
    byZone.delete(zoneId);
  };

  if (cycleZoneId && byZone.has(cycleZoneId)) {
    const name = filtered.find((r) => r.zoneId === cycleZoneId)?.zoneName;
    pushGroup(cycleZoneId, name ? `Зона: ${name}` : 'Зона цикла');
  }

  const otherZoneIds = [...byZone.keys()]
    .filter((id): id is string => id != null)
    .sort((a, b) => {
      const na = filtered.find((r) => r.zoneId === a)?.zoneName ?? '';
      const nb = filtered.find((r) => r.zoneId === b)?.zoneName ?? '';
      return na.localeCompare(nb, 'ru');
    });

  for (const zid of otherZoneIds) {
    const name = filtered.find((r) => r.zoneId === zid)?.zoneName;
    pushGroup(zid, name ? `Зона: ${name}` : 'Другая зона');
  }

  pushGroup(null, 'Без зоны');

  return groups;
}

function deviceHasBothMetrics(deviceId: string, rows: ClimateSourceRow[]): boolean {
  const kinds = new Set(rows.filter((r) => r.deviceId === deviceId).map((r) => r.kind));
  return kinds.has('temp') && kinds.has('rh');
}

function pickBestRow(candidates: ClimateSourceRow[], kind: 'temp' | 'rh'): ClimateSourceRow | null {
  const pool = candidates.filter((r) => r.kind === kind && r.usable);
  if (!pool.length) {
    const fallback = candidates.filter((r) => r.kind === kind);
    return fallback.sort(comparePickerRows)[0] ?? null;
  }
  return [...pool].sort(comparePickerRows)[0] ?? null;
}

export type SmartDefaultResult = {
  assignment: VpdSourceAssignment;
  leafMode: VpdLeafMode;
  autoSelected: boolean;
};

export function smartDefaultVpdSources(input: {
  rows: ClimateSourceRow[];
  cycleZoneId: string | null;
  saved?: VpdPersistedSources | null;
}): SmartDefaultResult {
  const savedAssignment = input.saved?.assignment ?? {
    airTemp: null,
    leafTemp: null,
    rh: null,
  };
  const savedLeafMode = input.saved?.leafMode ?? 'none';

  const usableRows = input.rows.filter((r) => r.usable);
  const inZone = (r: ClimateSourceRow) =>
    input.cycleZoneId != null && r.zoneId === input.cycleZoneId;

  let autoSelected = false;
  let air = savedAssignment.airTemp;
  let rh = savedAssignment.rh;
  let leaf = savedAssignment.leafTemp;
  let leafMode = savedLeafMode;

  const resolveRef = (ref: ClimatePointRef | null, kind: 'temp' | 'rh'): ClimateSourceRow | null => {
    if (!ref) return null;
    return (
      input.rows.find(
        (r) => r.deviceId === ref.deviceId && r.ref.code === ref.code && r.kind === kind
      ) ?? null
    );
  };

  if (!air || !rh) {
    const zoneRows = usableRows.filter(inZone);
    const comboDevice = zoneRows.find((r) => r.kind === 'temp' && deviceHasBothMetrics(r.deviceId, usableRows));
    if (comboDevice) {
      if (!air) {
        air = comboDevice.ref;
        autoSelected = true;
      }
      if (!rh) {
        const rhMatch = usableRows.find((r) => r.deviceId === comboDevice.deviceId && r.kind === 'rh');
        if (rhMatch) {
          rh = rhMatch.ref;
          autoSelected = true;
        }
      }
    }
    if (!air) {
      const picked = pickBestRow(zoneRows.length ? zoneRows : usableRows, 'temp');
      if (picked) {
        air = picked.ref;
        autoSelected = true;
      }
    }
    if (!rh) {
      const picked = pickBestRow(zoneRows.length ? zoneRows : usableRows, 'rh');
      if (picked) {
        rh = picked.ref;
        autoSelected = true;
      }
    }
    if (!air) {
      const picked = pickBestRow(usableRows, 'temp');
      if (picked) {
        air = picked.ref;
        autoSelected = true;
      }
    }
    if (!rh) {
      const picked = pickBestRow(usableRows, 'rh');
      if (picked) {
        rh = picked.ref;
        autoSelected = true;
      }
    }
  }

  return {
    assignment: { airTemp: air, leafTemp: leafMode === 'sensor' ? leaf : null, rh },
    leafMode,
    autoSelected,
  };
}

export function climateZonesMismatch(
  assignment: VpdSourceAssignment,
  rows: ClimateSourceRow[]
): boolean {
  const air = rows.find(
    (r) =>
      assignment.airTemp &&
      r.kind === 'temp' &&
      r.deviceId === assignment.airTemp.deviceId &&
      r.ref.code === assignment.airTemp.code
  );
  const rh = rows.find(
    (r) =>
      assignment.rh &&
      r.kind === 'rh' &&
      r.deviceId === assignment.rh.deviceId &&
      r.ref.code === assignment.rh.code
  );
  if (!air?.zoneId || !rh?.zoneId) return false;
  return air.zoneId !== rh.zoneId;
}

export function leafTempFromMode(input: {
  leafMode: VpdLeafMode;
  airTempC: number | null;
  leafReadingC: number | null;
}): number | null {
  if (input.leafMode === 'estimated' && input.airTempC != null) {
    return input.airTempC - VPD_LEAF_AIR_OFFSET_C;
  }
  if (input.leafMode === 'sensor') return input.leafReadingC;
  return null;
}

export function isCurrentPickerChoice(
  row: ClimateSourceRow,
  assignment: VpdSourceAssignment,
  leafMode: VpdLeafMode,
  pickerKind: 'air' | 'leaf' | 'rh'
): boolean {
  if (pickerKind === 'rh') return refsEqual(assignment.rh, row.ref);
  if (pickerKind === 'air') return refsEqual(assignment.airTemp, row.ref);
  if (pickerKind === 'leaf') return leafMode === 'sensor' && refsEqual(assignment.leafTemp, row.ref);
  return false;
}

export function filterPickerRows(
  rows: ClimateSourceRow[],
  query: string
): ClimateSourceRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.deviceName.toLowerCase().includes(q) ||
      (r.zoneName?.toLowerCase().includes(q) ?? false)
  );
}
