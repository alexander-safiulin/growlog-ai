import type { SupabaseClient } from '@supabase/supabase-js';

export async function proposeSopRevision(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    sopDefinitionId: string;
    title: string;
    bodyJson: Record<string, unknown>;
    instructionsJson: unknown[];
    reason: string;
    proposedBy: string;
  }
) {
  const { data: latest } = await supabase
    .from('sop_revisions')
    .select('version')
    .eq('sop_definition_id', params.sopDefinitionId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version as number | undefined ?? 0) + 1;

  const { data, error } = await supabase
    .from('sop_revisions')
    .insert({
      farm_id: params.farmId,
      sop_definition_id: params.sopDefinitionId,
      version,
      title: params.title,
      body_json: params.bodyJson,
      instructions_json: params.instructionsJson,
      reason: params.reason,
      proposed_by: params.proposedBy,
      status: 'draft',
    })
    .select('id, version')
    .single();
  if (error) throw error;
  return data as { id: string; version: number };
}

export async function approveSopRevision(
  supabase: SupabaseClient,
  params: {
    revisionId: string;
    farmId: string;
    approvedBy: string;
    effectiveFrom?: string;
  }
) {
  const effective_from = params.effectiveFrom ?? new Date().toISOString();
  const { data: rev, error: rErr } = await supabase
    .from('sop_revisions')
    .update({
      status: 'approved',
      approved_by: params.approvedBy,
      approved_at: new Date().toISOString(),
      effective_from,
    })
    .eq('id', params.revisionId)
    .eq('farm_id', params.farmId)
    .select('id, sop_definition_id, title, instructions_json, body_json')
    .single();
  if (rErr) throw rErr;

  const { error: dErr } = await supabase
    .from('sop_definitions')
    .update({
      title: rev.title,
      instructions_json: rev.instructions_json,
      current_revision_id: rev.id,
    })
    .eq('id', rev.sop_definition_id)
    .eq('farm_id', params.farmId);
  if (dErr) throw dErr;

  return rev;
}

export async function getEffectiveSopRevision(
  supabase: SupabaseClient,
  sopDefinitionId: string
) {
  const { data: def } = await supabase
    .from('sop_definitions')
    .select('current_revision_id')
    .eq('id', sopDefinitionId)
    .maybeSingle();
  if (!def?.current_revision_id) return null;
  const { data: rev } = await supabase
    .from('sop_revisions')
    .select('*')
    .eq('id', def.current_revision_id)
    .eq('status', 'approved')
    .maybeSingle();
  return rev;
}
