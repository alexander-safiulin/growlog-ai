import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const farmId = typeof req.query.farmId === 'string' ? req.query.farmId : '';
  if (!farmId) return res.status(400).json({ error: 'missing_farmId' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const [knowledgeRes, thresholdRes, sopRes] = await Promise.all([
    supabase
      .from('knowledge_items')
      .select('id, title, body, status, metadata, source_media_asset_id, created_at')
      .eq('farm_id', farmId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('playbook_thresholds')
      .select('id, metric_code, min_value, max_value, cycle_stage, status, reason, created_at')
      .eq('farm_id', farmId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('sop_revisions')
      .select('id, title, status, version, sop_definition_id, reason, created_at')
      .eq('farm_id', farmId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (knowledgeRes.error?.message?.match(/does not exist|schema cache|PGRST205/i)) {
    return res.status(503).json({ error: 'schema_not_ready', hint: 'Run pnpm db:push' });
  }

  return res.status(200).json({
    knowledge: knowledgeRes.data ?? [],
    thresholds: thresholdRes.data ?? [],
    sopRevisions: sopRes.data ?? [],
  });
}
