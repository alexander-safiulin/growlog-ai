import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClimatePointRef, VpdSourceAssignment } from './vpd';
import type { VpdPersistedSources } from './vpd-climate';

export type FarmTuyaLinkRow = {
  id: string;
  farm_id: string;
  tuya_uid: string;
  label: string | null;
  created_at: string;
};

export type FarmTuyaDeviceRow = {
  id: string;
  farm_id: string;
  tuya_uid: string;
  tuya_device_id: string;
  label: string | null;
  created_at: string;
};

function cleanRefForAllowlist(
  ref: ClimatePointRef | null,
  allowedDeviceIds: ReadonlySet<string>
): ClimatePointRef | null {
  if (!ref || !allowedDeviceIds.has(ref.deviceId)) return null;
  return ref;
}

export function restrictVpdSourcesToDeviceIds(
  sources: VpdPersistedSources,
  allowedDeviceIds: ReadonlySet<string>
): VpdPersistedSources {
  const assignment: VpdSourceAssignment = {
    airTemp: cleanRefForAllowlist(sources.assignment.airTemp, allowedDeviceIds),
    leafTemp: cleanRefForAllowlist(sources.assignment.leafTemp, allowedDeviceIds),
    rh: cleanRefForAllowlist(sources.assignment.rh, allowedDeviceIds),
  };
  let leafMode = sources.leafMode;
  if (leafMode === 'sensor' && !assignment.leafTemp) {
    leafMode = 'none';
  }
  return { assignment, leafMode };
}

export async function fetchFarmTuyaLinkRows(
  supabase: SupabaseClient,
  farmId: string
): Promise<FarmTuyaLinkRow[]> {
  const { data, error } = await supabase
    .from('farm_tuya_links')
    .select('id, farm_id, tuya_uid, label, created_at')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FarmTuyaLinkRow[];
}

export async function fetchFarmTuyaDeviceRows(
  supabase: SupabaseClient,
  farmId: string
): Promise<FarmTuyaDeviceRow[]> {
  const { data, error } = await supabase
    .from('farm_tuya_devices')
    .select('id, farm_id, tuya_uid, tuya_device_id, label, created_at')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FarmTuyaDeviceRow[];
}
