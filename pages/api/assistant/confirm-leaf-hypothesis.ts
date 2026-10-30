import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { maybeCreateDeviationFromEvent } from '@/lib/growlog/deviation-engine';
import type { LeafHypothesisCode } from '@growlog/domain';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const ALLOWED = new Set<LeafHypothesisCode>([
  'nitrogen',
  'phosphorus',
  'potassium',
  'magnesium',
  'sulfur',
  'iron',
  'manganese',
  'zinc',
  'calcium',
  'boron',
  'light_burn',
  'ph_lockout',
  'natural_senescence',
  'overwatering_stress',
]);

type Body = {
  farmId?: string;
  cycleId?: string | null;
  scopeId?: string | null;
  mediaAssetId?: string;
  hypothesisCode?: string;
  note?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const body = req.body as Body;
  if (!body.farmId) return res.status(400).json({ error: 'missing_farm_id' });
  if (!body.cycleId) return res.status(400).json({ error: 'missing_cycle_id' });
  if (!body.scopeId) return res.status(400).json({ error: 'missing_scope_id' });
  if (!body.mediaAssetId) return res.status(400).json({ error: 'missing_media_asset_id' });
  const code = typeof body.hypothesisCode === 'string' ? body.hypothesisCode.trim() : '';
  if (!ALLOWED.has(code as LeafHypothesisCode)) {
    return res.status(400).json({ error: 'invalid_hypothesis_code' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: prior } = await supabase
    .from('events')
    .select('id')
    .eq('farm_id', body.farmId)
    .eq('event_type', 'deficiency_suspected')
    .contains('payload', {
      media_asset_id: body.mediaAssetId,
      leaf_hypothesis_code: code,
      confirmed: true,
    })
    .limit(1)
    .maybeSingle();
  if (prior?.id) {
    return res.status(200).json({ eventId: prior.id, reused: true });
  }

  const userNote = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  const text = userNote || `Подтверждённая гипотеза по фото: ${code}`;

  const { data, error } = await supabase.rpc('create_log_entry', {
    p_farm_id: body.farmId,
    p_cycle_id: body.cycleId,
    p_scope_id: body.scopeId,
    p_event_type: 'deficiency_suspected',
    p_body: text,
    p_occurred_at: new Date().toISOString(),
    p_source_type: 'user_text',
    p_payload: {
      media_asset_id: body.mediaAssetId,
      leaf_hypothesis_code: code,
      origin: 'leaf_skill_confirm',
      confirmed: true,
      confirmed_by: user.id,
    },
    p_title: 'Гипотеза по листу',
  });
  if (error) {
    return res.status(500).json({ error: 'create_log_entry_failed', detail: error.message });
  }

  const eventRow = (data as { event?: { id?: string; event_type?: string } } | null)?.event;
  const eventId = eventRow?.id;
  if (eventId) {
    try {
      await maybeCreateDeviationFromEvent(supabase, {
        farmId: body.farmId,
        cycleId: body.cycleId ?? null,
        scopeId: body.scopeId,
        eventId,
        eventType: 'deficiency_suspected',
        title: 'Гипотеза по листу',
        body: text,
      });
    } catch {
      /* deviation is best-effort */
    }
  }

  return res.status(200).json({ eventId: eventId ?? null, reused: false });
}
