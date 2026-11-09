import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserFromBearer } from '@/lib/api/auth-from-request';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });

  const body = req.body as {
    farmId?: string;
    cycleId?: string | null;
    scopeId?: string | null;
    focusDate?: string | null;
  };
  if (!body.farmId) return res.status(400).json({ error: 'missing_farm_id' });
  if (!body.scopeId) return res.status(400).json({ error: 'missing_scope_id' });

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: farm } = await supabase
    .from('farms')
    .select('timezone')
    .eq('id', body.farmId)
    .maybeSingle();
  const timezone = (farm as { timezone?: string } | null)?.timezone ?? 'UTC';
  const focusDate =
    typeof body.focusDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.focusDate.trim())
      ? body.focusDate.trim()
      : new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
  const dedupKey = `focus.refresh:${body.scopeId}:${focusDate}`;

  const { data, error } = await supabase.rpc('enqueue_background_job', {
    p_job_type: 'focus.refresh',
    p_farm_id: body.farmId,
    p_priority: 'high',
    p_cycle_id: body.cycleId ?? null,
    p_scope_id: body.scopeId,
    p_entity_type: 'scope',
    p_entity_id: body.scopeId,
    p_dedup_key: dedupKey,
    p_payload_json: { focus_date: focusDate },
  });
  if (error) return res.status(500).json({ error: 'enqueue_failed', detail: error.message });

  return res.status(200).json({ jobId: data, enqueued: true });
}
