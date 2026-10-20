import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { fetchHandoverPack } from '@/lib/growlog/handover-queries';

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
  const cycleId =
    typeof req.query.cycleId === 'string' && req.query.cycleId ? req.query.cycleId : null;
  if (!farmId) return res.status(400).json({ error: 'missing_farm_id' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: farm } = await supabase.from('farms').select('timezone').eq('id', farmId).maybeSingle();
  const tz = (farm?.timezone as string | undefined) ?? 'UTC';
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  try {
    const pack = await fetchHandoverPack(supabase, { farmId, cycleId, timezone: tz, today });
    return res.status(200).json({ today, timezone: tz, ...pack });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'handover_failed';
    return res.status(500).json({ error: 'handover_failed', detail: msg });
  }
}
