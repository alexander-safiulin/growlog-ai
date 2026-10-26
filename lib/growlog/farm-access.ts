import type { SupabaseClient } from '@supabase/supabase-js';

const APPROVER_ROLES = new Set(['admin', 'manager']);

export async function assertFarmApprover(
  supabase: SupabaseClient,
  farmId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('farm_users')
    .select('role')
    .eq('farm_id', farmId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !APPROVER_ROLES.has(data.role as string)) {
    const err = new Error('approver_required');
    throw err;
  }
}

export function isApproverRole(role: string | null | undefined): boolean {
  return !!role && APPROVER_ROLES.has(role);
}

export function isFarmAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}
