import type { SupabaseClient } from '@supabase/supabase-js';
import {
  farmAnchorDateFromOccurredAt,
  materializeSopRunsForScopeDay,
  occurredAtFromStageChangeResult,
  type Farm,
} from '@growlog/domain';

/** Best-effort SOP materialize for the farm-local day of a stage transition (direct Supabase). */
export async function materializeSopAfterStageChangeMobile(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId?: string | null;
    occurredAt: string;
    timezone: string;
  }
): Promise<void> {
  const anchorDate = farmAnchorDateFromOccurredAt(params.occurredAt, params.timezone);
  try {
    await materializeSopRunsForScopeDay(supabase, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      scopeId: params.scopeId ?? null,
      anchorDate,
      timezone: params.timezone,
    });
  } catch {
    /* must not block cycle UX */
  }
}

export async function materializeSopAfterStageRpcResult(
  supabase: SupabaseClient,
  params: {
    farm: Pick<Farm, 'id' | 'timezone'> | null | undefined;
    cycleId: string;
    scopeId?: string | null;
    rpcResult: unknown;
  }
): Promise<void> {
  if (!params.farm) return;
  const occurredAt = occurredAtFromStageChangeResult(params.rpcResult) ?? new Date().toISOString();
  await materializeSopAfterStageChangeMobile(supabase, {
    farmId: params.farm.id,
    cycleId: params.cycleId,
    scopeId: params.scopeId ?? null,
    occurredAt,
    timezone: params.farm.timezone ?? 'UTC',
  });
}
