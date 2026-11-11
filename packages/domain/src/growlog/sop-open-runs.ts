import type { SupabaseClient } from '@supabase/supabase-js';
import { farmLocalDateString, materializeSopRunsForScopeDay } from './sop-materialize';
import {
  materializeSopRunsForAnchorOnce,
  sopMaterializeScopeKey,
  clearSopMaterializeOnce,
} from './sop-materialize-once';
import { fetchOpenSopRuns } from './sop-queries';
import type { SopRunRow } from '../types/sop';

/** React Query staleTime for open runs lists (web + mobile). */
export const SOP_OPEN_RUNS_STALE_MS = 60_000;

export { clearSopMaterializeOnce, sopMaterializeScopeKey };

/**
 * Best-effort materialize for today's farm-local anchor, then fetch open runs.
 * Worker `sop.materialize` / `focus.refresh` remain canonical when worker is ahead.
 */
export async function loadOpenSopRunsForCycleDay(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    timezone: string;
    scopeId?: string | null;
    anchorDate?: string;
    forceMaterialize?: boolean;
  }
): Promise<SopRunRow[]> {
  const anchorDate = params.anchorDate ?? farmLocalDateString(params.timezone);
  const scopeKey = sopMaterializeScopeKey(params.farmId, params.cycleId);
  if (params.forceMaterialize) clearSopMaterializeOnce(scopeKey);

  await materializeSopRunsForAnchorOnce(scopeKey, anchorDate, async () => {
    try {
      await materializeSopRunsForScopeDay(supabase, {
        farmId: params.farmId,
        cycleId: params.cycleId,
        scopeId: params.scopeId ?? null,
        anchorDate,
        timezone: params.timezone,
      });
    } catch {
      /* client path is UX acceleration only */
    }
  });

  return fetchOpenSopRuns(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
  });
}
