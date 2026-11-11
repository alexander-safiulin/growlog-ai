import type { SupabaseClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import { occurredAtFromStageChangeResult } from '@growlog/domain';
import { materializeSopRunsForDay, type MaterializeResult } from '@/lib/growlog/sop-engine';

export { occurredAtFromStageChangeResult } from '@growlog/domain';

export function farmAnchorDateFromOccurredAt(occurredAtIso: string, timezone: string): string {
  return formatInTimeZone(new Date(occurredAtIso), timezone || 'UTC', 'yyyy-MM-dd');
}

/** Best-effort: stage-based SOP runs for the farm-local day of the transition. */
export async function materializeSopRunsAfterStageChange(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    occurredAt: string;
    timezone: string;
    now?: Date;
  }
): Promise<MaterializeResult> {
  const anchorDate = farmAnchorDateFromOccurredAt(params.occurredAt, params.timezone);
  return materializeSopRunsForDay(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    anchorDate,
    timezone: params.timezone,
    now: params.now,
  });
}

export async function materializeSopRunsAfterStageChangeBestEffort(
  supabase: SupabaseClient,
  params: Parameters<typeof materializeSopRunsAfterStageChange>[1]
): Promise<void> {
  try {
    await materializeSopRunsAfterStageChange(supabase, params);
  } catch {
    /* materialize must not block stage transition */
  }
}
