import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { assertFarmApprover } from '@/lib/growlog/farm-access';

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
  const memoryId = typeof req.body?.memoryId === 'string' ? req.body.memoryId : '';
  if (!farmId || !memoryId) return res.status(400).json({ error: 'missing_params' });

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

  const { data, error } = await supabase
    .from('grow_memory_items')
    .update({ status: 'approved' })
    .eq('id', memoryId)
    .eq('farm_id', farmId)
    .select('id, title')
    .single();
  if (error) return res.status(500).json({ error: 'approve_failed', detail: error.message });

  await supabase
    .from('searchable_documents')
    .update({ metadata: { status: 'approved', memory_type: 'lesson' } })
    .eq('farm_id', farmId)
    .eq('doc_type', 'grow_memory_item')
    .eq('source_id', memoryId);

  return res.status(200).json({ ok: true, memory: data });
}
