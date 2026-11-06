import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeAssignment, type TuyaStatusDevice } from '@growlog/domain';
import { filterTuyaDevicesForFarm, fetchFarmTuyaBindings } from '@/lib/tuya/farm-bindings';
import { TuyaConfigError, listTuyaProjectDeviceRecords } from '@/lib/tuya/client';
import {
  CLIMATE_SAMPLE_MIN_GAP_MS,
  climateSamplesFromAssignment,
  resolveClimateSampleScope,
  type ClimateSamplePoint,
  type ScopeCandidate,
} from '@/lib/growlog/climate-sample-plan';

type SourceRow = {
  farm_id: string;
  cycle_id: string | null;
  zone_id: string | null;
  scope_id: string | null;
  assignment: unknown;
};

export async function sampleAssignedClimate(
  supabase: SupabaseClient,
  now = new Date()
): Promise<{ written: number; skipped: number }> {
  let devices: Awaited<ReturnType<typeof listTuyaProjectDeviceRecords>>;
  try {
    devices = await listTuyaProjectDeviceRecords();
  } catch (error) {
    if (error instanceof TuyaConfigError) return { written: 0, skipped: 0 };
    throw error;
  }

  const { data: sources, error } = await supabase
    .from('grow_cycle_vpd_sources')
    .select('farm_id, cycle_id, zone_id, scope_id, assignment');
  if (error) throw error;

  const metricIds = await loadMetricIds(supabase);
  let written = 0;
  let skipped = 0;

  for (const row of (sources ?? []) as SourceRow[]) {
    const assignment = sanitizeAssignment(row.assignment);
    const farmDevices = await farmDeviceViews(supabase, row.farm_id, devices);
    const samples = climateSamplesFromAssignment(assignment, farmDevices);
    if (!samples.length) {
      skipped += 1;
      continue;
    }
    const cycleId = await resolveCycleId(supabase, row);
    if (!cycleId) {
      skipped += 1;
      continue;
    }
    const scopes = await loadScopes(supabase, row.farm_id, cycleId);
    const assignedScope = scopes.find((scope) => scope.active && scope.id === row.scope_id);
    const resolved = assignedScope
      ? { scopeId: assignedScope.id }
      : resolveClimateSampleScope(scopes, row.zone_id);
    if (!('scopeId' in resolved)) {
      skipped += 1;
      continue;
    }
    for (const sample of samples) {
      const metricId = metricIds.get(sample.metricCode);
      if (!metricId) {
        skipped += 1;
        continue;
      }
      const inserted = await writeSample(supabase, {
        farmId: row.farm_id,
        cycleId,
        scopeId: resolved.scopeId,
        metricId,
        sample,
        now,
      });
      if (inserted) written += 1;
      else skipped += 1;
    }
  }

  return { written, skipped };
}

async function farmDeviceViews(
  supabase: SupabaseClient,
  farmId: string,
  records: Awaited<ReturnType<typeof listTuyaProjectDeviceRecords>>
): Promise<TuyaStatusDevice[]> {
  const bindings = await fetchFarmTuyaBindings(supabase, farmId);
  return filterTuyaDevicesForFarm(records, bindings).map((device) => ({
    id: device.id,
    name: device.name,
    status: device.status,
  }));
}

async function loadMetricIds(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('sensor_metrics')
    .select('id, metric_code')
    .is('farm_id', null)
    .in('metric_code', ['temp_air', 'rh']);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.metric_code as string, row.id as string);
  }
  return map;
}

async function resolveCycleId(supabase: SupabaseClient, row: SourceRow): Promise<string | null> {
  if (row.cycle_id) {
    const { data } = await supabase
      .from('grow_cycles')
      .select('id')
      .eq('id', row.cycle_id)
      .eq('farm_id', row.farm_id)
      .eq('status', 'active')
      .maybeSingle();
    return data?.id ?? null;
  }
  if (!row.zone_id) return null;
  const { data: scopes } = await supabase
    .from('scopes')
    .select('cycle_id')
    .eq('farm_id', row.farm_id)
    .eq('zone_id', row.zone_id)
    .eq('active', true);
  const cycleIds = [
    ...new Set(
      (scopes ?? [])
        .map((s) => s.cycle_id as string | null)
        .filter((id): id is string => !!id)
    ),
  ];
  if (cycleIds.length !== 1) return null;
  const { data: cycle } = await supabase
    .from('grow_cycles')
    .select('id')
    .eq('id', cycleIds[0])
    .eq('status', 'active')
    .maybeSingle();
  return cycle?.id ?? null;
}

async function loadScopes(
  supabase: SupabaseClient,
  farmId: string,
  cycleId: string
): Promise<ScopeCandidate[]> {
  const { data, error } = await supabase
    .from('scopes')
    .select('id, zone_id, scope_type, active')
    .eq('farm_id', farmId)
    .eq('cycle_id', cycleId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    zoneId: (row.zone_id as string | null) ?? null,
    scopeType: row.scope_type as string,
    active: Boolean(row.active),
  }));
}

async function writeSample(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    metricId: string;
    sample: ClimateSamplePoint;
    now: Date;
  }
): Promise<boolean> {
  const since = new Date(params.now.getTime() - CLIMATE_SAMPLE_MIN_GAP_MS).toISOString();
  const { data: recent } = await supabase
    .from('sensor_readings')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('scope_id', params.scopeId)
    .eq('metric_id', params.metricId)
    .gte('captured_at', since)
    .limit(1);
  if (recent?.length) return false;

  const capturedAt = params.now.toISOString();
  const { data: reading, error } = await supabase
    .from('sensor_readings')
    .insert({
      farm_id: params.farmId,
      metric_id: params.metricId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      captured_at: capturedAt,
      value_numeric: params.sample.value,
      unit: params.sample.unit,
      ingestion_source: 'tuya_sample',
      raw_payload: {
        tuya_device_id: params.sample.deviceId,
        status_code: params.sample.statusCode,
      },
    })
    .select('id')
    .single();
  if (error) throw error;

  const hour = capturedAt.slice(0, 13);
  const dedupKey = `snapshot.refresh:${params.scopeId}:${params.metricId}:${hour}`;
  const { data: existingJob } = await supabase
    .from('background_jobs')
    .select('id')
    .eq('farm_id', params.farmId)
    .eq('dedup_key', dedupKey)
    .in('status', ['pending', 'running', 'retrying'])
    .limit(1);
  if (!existingJob?.length && reading?.id) {
    const { error: jobError } = await supabase.from('background_jobs').insert({
      job_type: 'snapshot.refresh',
      status: 'pending',
      priority: 'low',
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      entity_type: 'sensor_reading',
      entity_id: reading.id,
      dedup_key: dedupKey,
      payload_json: { sensor_reading_id: reading.id, captured_at: capturedAt },
    });
    if (jobError) throw jobError;
  }
  return true;
}
