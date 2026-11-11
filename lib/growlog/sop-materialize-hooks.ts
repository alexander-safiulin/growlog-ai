import type { SupabaseClient } from '@supabase/supabase-js';
import {
  farmAnchorDateFromOccurredAt,
  materializeSopRunsForDay,
  occurredAtFromStageChangeResult,
  type MaterializeResult,
} from '@growlog/domain';

export { farmAnchorDateFromOccurredAt, occurredAtFromStageChangeResult } from '@growlog/domain';

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
