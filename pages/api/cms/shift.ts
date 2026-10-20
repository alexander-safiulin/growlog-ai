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
  const managerParticipated = req.body?.managerParticipated === true;
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : null;
  if (!farmId) return res.status(400).json({ error: 'missing_farm_id' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: member, error: mErr } = await supabase
    .from('farm_users')
    .select('role')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (mErr) return res.status(500).json({ error: 'role_lookup_failed', detail: mErr.message });
  if (!member || member.role === 'viewer') return res.status(403).json({ error: 'role_forbidden' });

  const { data: farm } = await supabase.from('farms').select('timezone').eq('id', farmId).maybeSingle();
  const tz = (farm?.timezone as string | undefined) ?? 'UTC';
  const shiftDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const { data, error } = await supabase
    .from('shift_handovers')
    .upsert(
      {
        farm_id: farmId,
        cycle_id: cycleId,
        shift_date: shiftDate,
        recorded_by: user.id,
        recorder_role: member.role,
        manager_participated: managerParticipated || member.role === 'manager' || member.role === 'admin',
      },
      { onConflict: 'farm_id,shift_date,recorded_by' }
    )
    .select('id, shift_date, manager_participated')
    .single();
  if (error) return res.status(500).json({ error: 'shift_failed', detail: error.message });
  return res.status(201).json({ ok: true, shift: data });
}
