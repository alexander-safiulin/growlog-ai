import {
  buildSensorMetaIndex,
  type FarmZoneMeta,
  type TuyaClimateDevice,
} from '@growlog/domain';
import type { TuyaDeviceView } from '@/lib/tuya/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type EnrichedTuyaDevice = TuyaDeviceView & {
  zoneId: string | null;
  lastSeenAt: string | null;
  readingAt: string | null;
  sensorDeviceId: string | null;
  isInfrared: boolean;
};

export type TuyaDevicesPayload = {
  devices: EnrichedTuyaDevice[];
  zones: FarmZoneMeta[];
};

type SensorRow = {
  id: string;
  zone_id: string | null;
  last_seen_at: string | null;
  device_type: string | null;
  serial_number: string | null;
  config: Record<string, unknown> | null;
  name: string;
};

export async function fetchTuyaClimatePayload(
  supabase: SupabaseClient,
  farmId: string,
  tuyaDevices: TuyaDeviceView[]
): Promise<TuyaDevicesPayload> {
  const [{ data: sensorRows }, { data: zoneRows }] = await Promise.all([
    supabase
      .from('sensor_devices')
      .select('id, zone_id, last_seen_at, device_type, serial_number, config, name')
      .eq('farm_id', farmId)
      .neq('status', 'retired'),
    supabase.from('farm_zones').select('id, name').eq('farm_id', farmId).order('name'),
  ]);

  const sensors = (sensorRows ?? []) as SensorRow[];
  const sensorIds = sensors.map((s) => s.id);
  const readingAtBySensorId = new Map<string, string>();
  if (sensorIds.length > 0) {
    const { data: recentReadings } = await supabase
      .from('sensor_readings')
      .select('device_id, captured_at')
      .eq('farm_id', farmId)
      .in('device_id', sensorIds)
      .order('captured_at', { ascending: false })
      .limit(500);
    for (const row of recentReadings ?? []) {
      const deviceId = row.device_id as string | null;
      const capturedAt = row.captured_at as string | null;
      if (!deviceId || !capturedAt || readingAtBySensorId.has(deviceId)) continue;
      readingAtBySensorId.set(deviceId, capturedAt);
    }
  }

  const index = buildSensorMetaIndex(sensors);

  const zones: FarmZoneMeta[] = (zoneRows ?? []).map((z) => ({
    id: z.id as string,
    name: z.name as string,
  }));

  if (!zones.length && sensors.some((s) => s.zone_id)) {
    const zoneIds = [...new Set(sensors.map((s) => s.zone_id).filter(Boolean))] as string[];
    if (zoneIds.length) {
      const { data: named } = await supabase.from('farm_zones').select('id, name').in('id', zoneIds);
      for (const z of named ?? []) {
        zones.push({ id: z.id as string, name: z.name as string });
      }
    }
  }

  const devices: EnrichedTuyaDevice[] = tuyaDevices.map((device) => {
    const meta = index.get(device.id);
    const sensorDeviceId = meta?.sensorDeviceId ?? null;
    const readingAt = sensorDeviceId ? readingAtBySensorId.get(sensorDeviceId) ?? null : null;
    return {
      ...device,
      zoneId: meta?.zoneId ?? null,
      lastSeenAt: meta?.lastSeenAt ?? null,
      readingAt,
      sensorDeviceId,
      isInfrared: meta?.isInfrared ?? false,
    };
  });

  return { devices, zones };
}

export function toTuyaClimateDevices(devices: EnrichedTuyaDevice[]): TuyaClimateDevice[] {
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    online: d.online,
    category: d.category,
    status: d.status,
  }));
}
