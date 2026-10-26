import type { SupabaseClient } from '@supabase/supabase-js';
import type { TuyaDeviceRecord, TuyaDeviceView } from '@/lib/tuya/client';
import { toPublicDeviceView } from '@/lib/tuya/client';

export type FarmTuyaBindings = {
  linkedUids: Set<string>;
  linkedDeviceIds: Set<string>;
};

export function hasFarmTuyaBindings(bindings: FarmTuyaBindings): boolean {
  return bindings.linkedUids.size > 0 || bindings.linkedDeviceIds.size > 0;
}

export async function fetchFarmTuyaBindings(
  supabase: SupabaseClient,
  farmId: string
): Promise<FarmTuyaBindings> {
  const [{ data: links, error: linksError }, { data: devices, error: devicesError }] =
    await Promise.all([
      supabase.from('farm_tuya_links').select('tuya_uid').eq('farm_id', farmId),
      supabase.from('farm_tuya_devices').select('tuya_device_id').eq('farm_id', farmId),
    ]);
  if (linksError) throw linksError;
  if (devicesError) throw devicesError;

  const linkedUids = new Set<string>();
  for (const row of links ?? []) {
    const uid = typeof row.tuya_uid === 'string' ? row.tuya_uid.trim() : '';
    if (uid) linkedUids.add(uid);
  }
  const linkedDeviceIds = new Set<string>();
  for (const row of devices ?? []) {
    const id = typeof row.tuya_device_id === 'string' ? row.tuya_device_id.trim() : '';
    if (id) linkedDeviceIds.add(id);
  }
  return { linkedUids, linkedDeviceIds };
}

export function filterTuyaDevicesForFarm(
  devices: TuyaDeviceRecord[],
  bindings: FarmTuyaBindings
): TuyaDeviceView[] {
  if (!hasFarmTuyaBindings(bindings)) return [];
  const out: TuyaDeviceView[] = [];
  for (const device of devices) {
    const ownerLinked =
      device.ownerUid != null && bindings.linkedUids.has(device.ownerUid);
    if (bindings.linkedDeviceIds.has(device.id)) {
      if (ownerLinked) out.push(stripOwner(device));
      continue;
    }
    if (ownerLinked) {
      out.push(stripOwner(device));
    }
  }
  return out;
}

function stripOwner(device: TuyaDeviceRecord): TuyaDeviceView {
  return toPublicDeviceView(device);
}
