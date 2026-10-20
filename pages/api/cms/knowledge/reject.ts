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
  const knowledgeItemId = typeof req.body?.knowledgeItemId === 'string' ? req.body.knowledgeItemId : '';
  if (!farmId || !knowledgeItemId) return res.status(400).json({ error: 'missing_params' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { error } = await supabase
    .from('knowledge_items')
    .delete()
    .eq('id', knowledgeItemId)
    .eq('farm_id', farmId)
    .eq('status', 'draft');
  if (error) return res.status(500).json({ error: 'reject_failed', detail: error.message });

  await supabase
    .from('searchable_documents')
    .delete()
    .eq('farm_id', farmId)
    .eq('doc_type', 'knowledge_item')
    .eq('source_id', knowledgeItemId);

  return res.status(200).json({ ok: true });
}
