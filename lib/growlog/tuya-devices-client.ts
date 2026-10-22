import type { TuyaDeviceView } from '@/lib/tuya/client';

export async function fetchTuyaDevicesForFarm(
  farmId: string,
  token: string
): Promise<TuyaDeviceView[]> {
  const response = await fetch(`/api/integrations/tuya/devices?farmId=${encodeURIComponent(farmId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as {
    devices?: TuyaDeviceView[];
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
  return body.devices ?? [];
}
