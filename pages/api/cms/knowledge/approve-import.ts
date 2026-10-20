import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { assertFarmApprover } from '@/lib/growlog/farm-access';
import { approveSopRevision, proposeSopRevision } from '@growlog/domain';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const farmId = typeof req.body?.farmId === 'string' ? req.body.farmId : '';
  const knowledgeItemId = typeof req.body?.knowledgeItemId === 'string' ? req.body.knowledgeItemId : '';
  const sopDefinitionId =
    typeof req.body?.sopDefinitionId === 'string' ? req.body.sopDefinitionId : '';
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
  if (!farmId || !knowledgeItemId) return res.status(400).json({ error: 'missing_params' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    await assertFarmApprover(supabase, farmId, user.id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'approver_required';
    if (msg === 'approver_required') return res.status(403).json({ error: 'approver_required' });
    return res.status(500).json({ error: 'role_check_failed', detail: msg });
  }

  const { data: item, error: loadErr } = await supabase
    .from('knowledge_items')
    .select('id, title, body, status, metadata')
    .eq('id', knowledgeItemId)
    .eq('farm_id', farmId)
    .single();
  if (loadErr || !item) return res.status(404).json({ error: 'not_found' });
  if (item.status !== 'draft') return res.status(400).json({ error: 'not_draft' });

  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const kind = typeof meta.import_draft_kind === 'string' ? meta.import_draft_kind : 'playbook_rule';

  if (kind === 'sop_procedure') {
    const defId =
      sopDefinitionId ||
      (typeof meta.sop_definition_id === 'string' ? meta.sop_definition_id : '');
    if (!defId) return res.status(400).json({ error: 'sop_definition_required' });
    const bodyText = typeof item.body === 'string' ? item.body : '';
    try {
      const rev = await proposeSopRevision(supabase, {
        farmId,
        sopDefinitionId: defId,
        title: (item.title as string) || 'Imported SOP',
        bodyJson: { text: bodyText },
        instructionsJson: bodyText
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean),
        reason: 'Approved from document import',
        proposedBy: user.id,
      });
      await approveSopRevision(supabase, {
        revisionId: rev.id,
        farmId,
        approvedBy: user.id,
      });
      await supabase
        .from('knowledge_items')
        .update({ status: 'retired', metadata: { ...meta, promoted_sop_revision_id: rev.id } })
        .eq('id', knowledgeItemId);
      return res.status(200).json({ ok: true, sopRevisionId: rev.id, approved: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'sop_propose_failed';
      return res.status(500).json({ error: 'sop_propose_failed', detail: msg });
    }
  }

  if (kind === 'cycle_stage') {
    const stage = typeof meta.stage === 'string' ? meta.stage : '';
    const resolvedCycle =
      cycleId || (typeof meta.cycle_id === 'string' ? meta.cycle_id : '');
    if (!stage || !resolvedCycle) {
      return res.status(400).json({ error: 'cycle_and_stage_required' });
    }
    const { error: planErr } = await supabase.from('cycle_stage_plan').upsert(
      {
        farm_id: farmId,
        cycle_id: resolvedCycle,
        stage,
        planned_start: typeof meta.planned_start === 'string' ? meta.planned_start : null,
        planned_end: typeof meta.planned_end === 'string' ? meta.planned_end : null,
        notes: typeof item.body === 'string' ? item.body.slice(0, 2000) : null,
      },
      { onConflict: 'cycle_id,stage' }
    );
    if (planErr) return res.status(500).json({ error: 'stage_plan_failed', detail: planErr.message });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('knowledge_items')
    .update({ status: 'approved', approved_by: user.id, approved_at: now })
    .eq('id', knowledgeItemId)
    .eq('farm_id', farmId)
    .select('id, title')
    .single();
  if (error) return res.status(500).json({ error: 'approve_failed', detail: error.message });

  await supabase
    .from('searchable_documents')
    .update({ metadata: { status: 'approved' } })
    .eq('farm_id', farmId)
    .eq('doc_type', 'knowledge_item')
    .eq('source_id', knowledgeItemId);

  return res.status(200).json({ ok: true, item: data });
}
