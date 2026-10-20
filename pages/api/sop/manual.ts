import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';

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
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
  const scopeId = typeof req.body?.scopeId === 'string' ? req.body.scopeId : '';
  const sopDefinitionId = typeof req.body?.sopDefinitionId === 'string' ? req.body.sopDefinitionId : '';
  if (!farmId || !cycleId || !scopeId || !sopDefinitionId) {
    return res.status(400).json({ error: 'missing_params' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.rpc('create_manual_sop_run', {
    p_farm_id: farmId,
    p_cycle_id: cycleId,
    p_scope_id: scopeId,
    p_sop_definition_id: sopDefinitionId,
  });
  if (error) return res.status(500).json({ error: 'manual_run_failed', detail: error.message });
  return res.status(201).json({ ok: true, runId: data });
}
