import type { FarmZoneMeta } from '@growlog/domain';
import type { TuyaDeviceView } from '@/lib/tuya/client';

export type EnrichedTuyaDevice = TuyaDeviceView & {
  zoneId: string | null;
  lastSeenAt: string | null;
  sensorDeviceId: string | null;
  isInfrared: boolean;
};

export type TuyaFarmClimateResponse = {
  devices: EnrichedTuyaDevice[];
  zones: FarmZoneMeta[];
};

export async function fetchTuyaClimateForFarm(
  farmId: string,
  token: string
): Promise<TuyaFarmClimateResponse> {
  const response = await fetch(`/api/integrations/tuya/devices?farmId=${encodeURIComponent(farmId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as TuyaFarmClimateResponse & {
    error?: string;
    detail?: string;
  };
  if (!response.ok) {
    const error = new Error(body.detail || body.error || 'tuya_request_failed') as Error & {
      errorCode?: string;
    };
    error.errorCode = body.error;
    throw error;
  }
  return {
    devices: body.devices ?? [],
    zones: body.zones ?? [],
  };
}

/** @deprecated use fetchTuyaClimateForFarm */
export async function fetchTuyaDevicesForFarm(
  farmId: string,
  token: string
): Promise<TuyaDeviceView[]> {
  const payload = await fetchTuyaClimateForFarm(farmId, token);
  return payload.devices;
}
