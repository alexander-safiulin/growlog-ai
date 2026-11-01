import type { SupabaseClient } from '@supabase/supabase-js';

/** Ensures JWT can read the farm (RLS + membership). */
export async function assertFarmReadable(
  supabase: SupabaseClient,
  farmId: string
): Promise<void> {
  const { data, error } = await supabase.from('farms').select('id').eq('id', farmId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error('farm_not_found');
    throw err;
  }
}

/** Cycle and scope must belong to the same farm before SOP import commit. */
export async function assertCycleScopeForFarm(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; scopeId: string }
): Promise<void> {
  const { farmId, cycleId, scopeId } = params;
  const { data: cycle, error: cErr } = await supabase
    .from('grow_cycles')
    .select('id, farm_id')
    .eq('id', cycleId)
    .eq('farm_id', farmId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cycle) {
    const err = new Error('cycle_not_found');
    throw err;
  }

  const { data: scope, error: sErr } = await supabase
    .from('scopes')
    .select('id, farm_id, cycle_id')
    .eq('id', scopeId)
    .eq('farm_id', farmId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!scope) {
    const err = new Error('invalid_scope');
    throw err;
  }
  if (scope.cycle_id && scope.cycle_id !== cycleId) {
    const err = new Error('cycle_scope_mismatch');
    throw err;
  }
}

export async function farmHasSopImportWithContentHash(
  supabase: SupabaseClient,
  farmId: string,
  contentHash: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('sop_documents')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('metadata->>content_hash', contentHash);
  if (error) throw error;
  return (count ?? 0) > 0;
}
