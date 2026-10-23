import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeAssignment, type VpdSourceAssignment } from './vpd';
import type { VpdLeafMode, VpdPersistedSources } from './vpd-climate';

export type GrowCycleVpdSourcesRow = {
  id: string;
  farm_id: string;
  cycle_id: string | null;
  zone_id: string | null;
  assignment: VpdSourceAssignment;
  leaf_mode: VpdLeafMode;
  updated_at: string;
};

function parseLeafMode(raw: unknown): VpdLeafMode {
  if (raw === 'sensor' || raw === 'estimated' || raw === 'none') return raw;
  return 'none';
}

export function parseVpdPersistedRow(row: {
  assignment: unknown;
  leaf_mode?: unknown;
}): VpdPersistedSources | null {
  const assignment = sanitizeAssignment(row.assignment);
  if (!assignment) return null;
  return {
    assignment,
    leafMode: parseLeafMode(row.leaf_mode),
  };
}

export async function fetchVpdSourcesForCycle(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string }
): Promise<VpdPersistedSources | null> {
  const { data, error } = await supabase
    .from('grow_cycle_vpd_sources')
    .select('assignment, leaf_mode')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return parseVpdPersistedRow(data);
}

export async function fetchVpdSourcesForZone(
  supabase: SupabaseClient,
  params: { farmId: string; zoneId: string }
): Promise<VpdPersistedSources | null> {
  const { data, error } = await supabase
    .from('grow_cycle_vpd_sources')
    .select('assignment, leaf_mode')
    .eq('farm_id', params.farmId)
    .eq('zone_id', params.zoneId)
    .is('cycle_id', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return parseVpdPersistedRow(data);
}

export async function upsertVpdSources(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    zoneId: string | null;
    sources: VpdPersistedSources;
    userId: string | null;
  }
): Promise<void> {
  if (!params.cycleId && !params.zoneId) return;
  const payload = {
    farm_id: params.farmId,
    cycle_id: params.cycleId,
    zone_id: params.cycleId ? null : params.zoneId,
    assignment: params.sources.assignment,
    leaf_mode: params.sources.leafMode,
    updated_by: params.userId,
  };

  if (params.cycleId) {
    const { data: existing } = await supabase
      .from('grow_cycle_vpd_sources')
      .select('id')
      .eq('farm_id', params.farmId)
      .eq('cycle_id', params.cycleId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('grow_cycle_vpd_sources')
        .update({
          assignment: payload.assignment,
          leaf_mode: payload.leaf_mode,
          updated_by: payload.updated_by,
        })
        .eq('id', existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('grow_cycle_vpd_sources').insert(payload);
    if (error) throw error;
    return;
  }

  if (!params.zoneId) return;
  const { data: existing } = await supabase
    .from('grow_cycle_vpd_sources')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('zone_id', params.zoneId)
    .is('cycle_id', null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('grow_cycle_vpd_sources')
      .update({
        assignment: payload.assignment,
        leaf_mode: payload.leaf_mode,
        updated_by: payload.updated_by,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('grow_cycle_vpd_sources').insert(payload);
  if (error) throw error;
}
