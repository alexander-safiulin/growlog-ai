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
  const mediaAssetId = typeof req.body?.mediaAssetId === 'string' ? req.body.mediaAssetId : '';
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : null;
  if (!farmId || !mediaAssetId) return res.status(400).json({ error: 'missing_params' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.rpc('enqueue_background_job', {
    p_farm_id: farmId,
    p_job_type: 'knowledge.import',
    p_entity_type: 'media_asset',
    p_entity_id: mediaAssetId,
    p_payload_json: {
      media_asset_id: mediaAssetId,
      cycle_id: cycleId,
      uploaded_by: user.id,
    },
    p_dedup_key: `knowledge.import:${mediaAssetId}`,
  });

  if (error) return res.status(500).json({ error: 'enqueue_failed', detail: error.message });
  return res.status(202).json({ ok: true, job: data });
}
