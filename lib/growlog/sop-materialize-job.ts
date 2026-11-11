import type { SupabaseClient } from '@supabase/supabase-js';
import { materializeSopRunsForDay, type MaterializeResult } from '@/lib/growlog/sop-engine';
import type { BackgroundJobRow } from '@/types/background-jobs';

function payloadAnchorDate(job: BackgroundJobRow): string | null {
  const v = job.payload_json?.anchor_date;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return null;
  return v.trim();
}

export async function materializeSopForFarmDay(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    anchorDate: string;
    timezone?: string;
    now?: Date;
  }
): Promise<MaterializeResult> {
  let tz = params.timezone;
  if (!tz) {
    const { data: farm, error } = await supabase
      .from('farms')
      .select('timezone')
      .eq('id', params.farmId)
      .maybeSingle();
    if (error) throw error;
    tz = (farm as { timezone?: string } | null)?.timezone ?? 'UTC';
  }
  return materializeSopRunsForDay(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    anchorDate: params.anchorDate,
    timezone: tz,
    now: params.now,
  });
}

/** ADR-008 worker: calendar SOP runs for one farm-local anchor day. */
export async function processSopMaterializeJob(
  supabase: SupabaseClient,
  job: BackgroundJobRow
): Promise<Record<string, unknown>> {
  const anchorDate = payloadAnchorDate(job);
  if (!anchorDate || !job.cycle_id) {
    return { materialized: false, reason: 'missing_anchor_or_cycle' };
  }
  const result = await materializeSopForFarmDay(supabase, {
    farmId: job.farm_id,
    cycleId: job.cycle_id,
    anchorDate,
  });
  return { materialized: true, anchor_date: anchorDate, ...result };
}
