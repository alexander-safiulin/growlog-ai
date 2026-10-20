import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { assertFarmApprover } from '@/lib/growlog/farm-access';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const NEXT_STATUS = new Set(['harvested', 'archived']);

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
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
  const status = typeof req.body?.status === 'string' ? req.body.status : 'harvested';
  if (!farmId || !cycleId || !NEXT_STATUS.has(status)) {
    return res.status(400).json({ error: 'missing_params' });
  }

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

  const { error: uErr } = await supabase
    .from('grow_cycles')
    .update({ status })
    .eq('id', cycleId)
    .eq('farm_id', farmId);
  if (uErr) return res.status(500).json({ error: 'close_failed', detail: uErr.message });

  const { data, error } = await supabase.rpc('enqueue_background_job', {
    p_job_type: 'cycle.lessons.draft',
    p_farm_id: farmId,
    p_cycle_id: cycleId,
    p_entity_type: 'grow_cycle',
    p_entity_id: cycleId,
    p_payload_json: { cycle_id: cycleId },
    p_dedup_key: `cycle.lessons.draft:${cycleId}`,
  });
  if (error) return res.status(500).json({ error: 'enqueue_failed', detail: error.message });
  return res.status(202).json({ ok: true, status, job: data });
}
