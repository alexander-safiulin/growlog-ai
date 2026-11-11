import type { SupabaseClient } from '@supabase/supabase-js';
import { materializeSopRuns } from '@growlog/api-client';
import { occurredAtFromStageChangeResult } from '@growlog/domain';
import type { Farm } from '@growlog/domain';
import { anchorDateFromIsoInTimezone } from '@/lib/sop-utils';

/** Best-effort SOP materialize for the farm-local day of a stage transition (uses web API). */
export async function materializeSopAfterStageChangeMobile(
  accessToken: string,
  params: { farmId: string; cycleId: string; occurredAt: string; timezone: string }
): Promise<void> {
  const anchorDate = anchorDateFromIsoInTimezone(params.occurredAt, params.timezone);
  try {
    await materializeSopRuns(accessToken, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      anchorDate,
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
    rpcResult: unknown;
  }
): Promise<void> {
  if (!params.farm) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;
  const occurredAt = occurredAtFromStageChangeResult(params.rpcResult) ?? new Date().toISOString();
  await materializeSopAfterStageChangeMobile(token, {
    farmId: params.farm.id,
    cycleId: params.cycleId,
    occurredAt,
    timezone: params.farm.timezone ?? 'UTC',
  });
}
