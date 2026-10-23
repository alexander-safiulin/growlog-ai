import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventType, SourceType } from '../types/domain';
import type { FarmRole } from '../types/farm';
import { mapGrowCycleRpcError } from './cycle-errors';

export async function createFarm(supabase: SupabaseClient, name: string, timezone: string) {
  const { data, error } = await supabase.rpc('create_farm_with_membership', {
    p_name: name,
    p_timezone: timezone,
  });
  if (error) throw error;
  return data as string;
}

export async function createGrowCycleTracking(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    name: string;
    cultivarName?: string;
    startDate: string;
    stage: string;
    zoneId?: string | null;
    plantCount?: number | null;
    startMaterial?: 'seed' | 'clone';
    lightHoursOn?: number;
    lightHoursOff?: number;
    lightsOnAt?: string;
  }
) {
  const { data, error } = await supabase.rpc('create_grow_cycle_tracking', {
    p_farm_id: params.farmId,
    p_name: params.name,
    p_cultivar_name: params.cultivarName ?? null,
    p_start_date: params.startDate,
    p_stage: params.stage,
    p_zone_id: params.zoneId ?? null,
    p_plant_count: params.plantCount ?? null,
    p_start_material: params.startMaterial ?? 'seed',
    p_light_hours_on: params.lightHoursOn ?? 18,
    p_light_hours_off: params.lightHoursOff ?? 6,
    p_lights_on_at: params.lightsOnAt ?? '06:00',
  });
  if (error) throw new Error(mapGrowCycleRpcError(error.message));
  const payload = data as { cycle: Record<string, unknown>; scope: Record<string, unknown> };
  return { cycle: payload.cycle, scope: payload.scope };
}

export type FeedingLogDoseInput = {
  productLabel: string;
  amountMl: number;
  fertilizerProductId?: string | null;
  farmFertilizerProductId?: string | null;
};

export async function createGrowCycleFeedingLog(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    entryKind: 'watering' | 'feeding';
    volumeMl: number;
    ph?: number | null;
    ecMs?: number | null;
    airTempC?: number | null;
    airRhPct?: number | null;
    recipeId?: string | null;
    comment?: string | null;
    occurredAt?: string;
    doses?: FeedingLogDoseInput[];
    newStage?: string | null;
    lightHoursOn?: number | null;
    lightHoursOff?: number | null;
    lightsOnAt?: string | null;
  }
) {
  const dosesJson = (params.doses ?? []).map((d) => ({
    product_label: d.productLabel,
    amount_ml: d.amountMl,
    fertilizer_product_id: d.fertilizerProductId ?? null,
    farm_fertilizer_product_id: d.farmFertilizerProductId ?? null,
  }));

  const { data, error } = await supabase.rpc('create_grow_cycle_feeding_log', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_scope_id: params.scopeId,
    p_entry_kind: params.entryKind,
    p_volume_ml: params.volumeMl,
    p_ph: params.ph ?? null,
    p_ec_ms: params.ecMs ?? null,
    p_air_temp_c: params.airTempC ?? null,
    p_air_rh_pct: params.airRhPct ?? null,
    p_recipe_id: params.recipeId ?? null,
    p_comment: params.comment ?? null,
    p_occurred_at: params.occurredAt ?? new Date().toISOString(),
    p_doses: dosesJson,
    p_new_stage: params.newStage ?? null,
    p_light_hours_on: params.lightHoursOn ?? null,
    p_light_hours_off: params.lightHoursOff ?? null,
    p_lights_on_at: params.lightsOnAt ?? null,
  });
  if (error) throw new Error(mapGrowCycleRpcError(error.message));
  return data as { event: Record<string, unknown>; entry: Record<string, unknown> };
}

export async function transitionGrowCycleStage(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    newStage: string;
    occurredAt?: string;
  },
) {
  const { data, error } = await supabase.rpc('transition_grow_cycle_stage', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_scope_id: params.scopeId,
    p_new_stage: params.newStage,
    p_occurred_at: params.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw new Error(mapGrowCycleRpcError(error.message));
  return data as { event: Record<string, unknown>; cycle: Record<string, unknown> };
}

export async function upsertGrowCycleHarvest(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    wetWeightKg?: number | null;
    dryWeightKg?: number | null;
    harvestedAt?: string;
    notes?: string | null;
  },
) {
  const { data, error } = await supabase.rpc('upsert_grow_cycle_harvest', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_scope_id: params.scopeId,
    p_wet_weight_kg: params.wetWeightKg ?? null,
    p_dry_weight_kg: params.dryWeightKg ?? null,
    p_harvested_at: params.harvestedAt ?? new Date().toISOString(),
    p_notes: params.notes ?? null,
  });
  if (error) throw new Error(mapGrowCycleRpcError(error.message));
  return data as { harvest: Record<string, unknown>; event: Record<string, unknown> | null };
}

export async function createCycleWithDefaultScope(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    name: string;
    cultivarName?: string;
    startDate: string;
    stage: string;
    createdBy?: string | null;
  }
) {
  const { farmId, name, cultivarName, startDate, stage } = params;
  const { data, error } = await supabase.rpc('create_cycle_with_default_scope', {
    p_farm_id: farmId,
    p_name: name,
    p_cultivar_name: cultivarName ?? null,
    p_start_date: startDate,
    p_stage: stage,
  });
  if (error) throw error;
  const payload = data as { cycle: Record<string, unknown>; scope: Record<string, unknown> };
  return { cycle: payload.cycle, scope: payload.scope };
}

export async function createFoundationSetup(
  supabase: SupabaseClient,
  params: {
    farmName: string;
    timezone: string;
    cycleName: string;
    cultivarName?: string;
    startDate: string;
    stage: string;
  }
) {
  const { data, error } = await supabase.rpc('create_foundation_setup', {
    p_farm_name: params.farmName,
    p_timezone: params.timezone,
    p_cycle_name: params.cycleName,
    p_cultivar_name: params.cultivarName ?? null,
    p_start_date: params.startDate,
    p_stage: params.stage,
  });
  if (error) throw error;
  return data as {
    farm_id: string;
    cycle: Record<string, unknown>;
    scope: Record<string, unknown>;
  };
}

export async function createLogEntry(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    eventType: EventType;
    body: string;
    occurredAt: string;
    sourceType: SourceType;
    createdBy?: string | null;
    /** Доп. поля в payload (например voice: { transcript }) — не подменяют факты в body. */
    payload?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase.rpc('create_log_entry', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_scope_id: params.scopeId,
    p_event_type: params.eventType,
    p_body: params.body,
    p_occurred_at: params.occurredAt,
    p_source_type: params.sourceType,
    p_payload: { ...(params.payload ?? {}) },
    p_title: null,
  });
  if (error) throw error;
  return data as { event: Record<string, unknown>; jobs: Record<string, unknown> };
}

export async function createPhotoCaptureEvent(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    file: File;
    caption?: string;
    userId?: string | null;
  }
) {
  const { farmId, cycleId, scopeId, file, caption, userId } = params;
  const occurredAt = new Date().toISOString();

  const path = `${farmId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;

  const { error: upErr } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase.rpc('finalize_photo_capture', {
    p_farm_id: farmId,
    p_cycle_id: cycleId,
    p_scope_id: scopeId,
    p_storage_bucket: 'media',
    p_storage_path: path,
    p_mime_type: file.type || 'image/jpeg',
    p_file_name: file.name,
    p_file_size: file.size,
    p_caption: caption ?? null,
    p_captured_at: occurredAt,
  });
  if (error) {
    await supabase.storage.from('media').remove([path]).catch(() => undefined);
    throw error;
  }

  return data as {
    event: Record<string, unknown>;
    asset: Record<string, unknown>;
    jobs: Record<string, unknown>;
  };
}

/** Mobile / React Native: upload raw bytes instead of browser File. */
export async function createPhotoCaptureUpload(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    bytes: ArrayBuffer | Uint8Array | Blob;
    fileName: string;
    mimeType: string;
    fileSize: number;
    caption?: string;
    userId?: string | null;
  }
) {
  const { farmId, cycleId, scopeId, caption } = params;
  const occurredAt = new Date().toISOString();
  const safeName = params.fileName.replace(/[^\w.-]/g, '_');
  const path = `${farmId}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage.from('media').upload(path, params.bytes, {
    cacheControl: '3600',
    upsert: false,
    contentType: params.mimeType || 'image/jpeg',
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase.rpc('finalize_photo_capture', {
    p_farm_id: farmId,
    p_cycle_id: cycleId,
    p_scope_id: scopeId,
    p_storage_bucket: 'media',
    p_storage_path: path,
    p_mime_type: params.mimeType || 'image/jpeg',
    p_file_name: params.fileName,
    p_file_size: params.fileSize,
    p_caption: caption ?? null,
    p_captured_at: occurredAt,
  });
  if (error) {
    await supabase.storage.from('media').remove([path]).catch(() => undefined);
    throw error;
  }

  return data as {
    event: Record<string, unknown>;
    asset: Record<string, unknown>;
    jobs: Record<string, unknown>;
  };
}

export async function createManualSensorReading(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    metricId: string;
    value: number;
    capturedAt: string;
    unit: string | null;
    userId?: string | null;
  }
) {
  const { data, error } = await supabase.rpc('create_manual_sensor_reading', {
    p_farm_id: params.farmId,
    p_cycle_id: params.cycleId,
    p_scope_id: params.scopeId,
    p_metric_id: params.metricId,
    p_value: params.value,
    p_captured_at: params.capturedAt,
    p_unit: params.unit,
  });
  if (error) throw error;
  return data as {
    event: Record<string, unknown>;
    reading: Record<string, unknown>;
    jobs: Record<string, unknown>;
  };
}

/** ADR-009: only farm admins (via RPC). */
export async function setFarmUserRole(
  supabase: SupabaseClient,
  params: { farmId: string; userId: string; role: FarmRole }
) {
  const { error } = await supabase.rpc('set_farm_user_role', {
    p_farm_id: params.farmId,
    p_user_id: params.userId,
    p_role: params.role,
  });
  if (error) throw error;
}

/** ADR-009: only farm admins (via RPC). */
export async function addFarmUserMembership(
  supabase: SupabaseClient,
  params: { farmId: string; userId: string; role: FarmRole }
) {
  const { data, error } = await supabase.rpc('add_farm_user_membership', {
    p_farm_id: params.farmId,
    p_user_id: params.userId,
    p_role: params.role,
  });
  if (error) throw error;
  return data as string;
}
