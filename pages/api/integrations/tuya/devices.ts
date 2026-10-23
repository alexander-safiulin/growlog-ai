import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { fetchTuyaClimatePayload } from '@/lib/growlog/vpd-tuya-enrich';
import { listTuyaProjectDevices, TuyaApiError, TuyaConfigError } from '@/lib/tuya/client';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const FARM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const farmId = typeof req.query.farmId === 'string' ? req.query.farmId.trim() : '';
  if (!FARM_ID.test(farmId)) return res.status(400).json({ error: 'missing_farm' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: member, error: memberError } = await supabase
    .from('farm_users')
    .select('role')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (memberError) return res.status(500).json({ error: 'membership_lookup_failed' });
  if (!member) return res.status(403).json({ error: 'farm_forbidden' });

  try {
    const tuyaDevices = await listTuyaProjectDevices();
    const payload = await fetchTuyaClimatePayload(supabase, farmId, tuyaDevices);
    return res.status(200).json(payload);
  } catch (error) {
    if (error instanceof TuyaConfigError) {
      return res.status(503).json({ error: 'tuya_unconfigured' });
    }
    if (error instanceof TuyaApiError) {
      return res.status(502).json({
        error: 'tuya_request_failed',
        detail: error.message,
        tuyaCode: error.tuyaCode,
      });
    }
    return res.status(500).json({ error: 'tuya_request_failed' });
  }
}
