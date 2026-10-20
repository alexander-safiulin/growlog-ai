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
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  if (!farmId || !action) return res.status(400).json({ error: 'missing_params' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: member } = await supabase
    .from('farm_users')
    .select('role')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member || member.role === 'viewer') return res.status(403).json({ error: 'role_forbidden' });

  if (action === 'apply_input') {
    const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
    const scopeId = typeof req.body?.scopeId === 'string' ? req.body.scopeId : '';
    const materialLotId = typeof req.body?.materialLotId === 'string' ? req.body.materialLotId : '';
    const quantity = Number(req.body?.quantity);
    if (!cycleId || !scopeId || !materialLotId || Number.isNaN(quantity)) {
      return res.status(400).json({ error: 'missing_params' });
    }
    const { data: lot, error: lErr } = await supabase
      .from('material_lots')
      .select('id, lot_code, material_id')
      .eq('id', materialLotId)
      .eq('farm_id', farmId)
      .maybeSingle();
    if (lErr) return res.status(500).json({ error: 'lot_lookup_failed', detail: lErr.message });
    if (!lot) return res.status(404).json({ error: 'lot_not_found' });

    const { data, error } = await supabase.rpc('create_log_entry', {
      p_farm_id: farmId,
      p_cycle_id: cycleId,
      p_scope_id: scopeId,
      p_event_type: 'feeding',
      p_body: `Input lot ${lot.lot_code}, quantity ${quantity}`,
      p_occurred_at: new Date().toISOString(),
      p_source_type: 'user_form',
      p_payload: { material_lot_id: lot.id, material_id: lot.material_id, quantity },
      p_title: `Input ${lot.lot_code}`,
    });
    if (error) return res.status(500).json({ error: 'apply_failed', detail: error.message });
    return res.status(201).json({ ok: true, result: data });
  }

  if (action === 'harvest') {
    const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
    const scopeId = typeof req.body?.scopeId === 'string' ? req.body.scopeId : '';
    const wet = req.body?.wetWeightKg == null ? null : Number(req.body.wetWeightKg);
    const dry = req.body?.dryWeightKg == null ? null : Number(req.body.dryWeightKg);
    if (!cycleId || !scopeId) return res.status(400).json({ error: 'missing_params' });
    const { data: event, error: eErr } = await supabase.rpc('create_log_entry', {
      p_farm_id: farmId,
      p_cycle_id: cycleId,
      p_scope_id: scopeId,
      p_event_type: 'harvest',
      p_body: `Harvest wet=${wet ?? '—'} dry=${dry ?? '—'}`,
      p_occurred_at: new Date().toISOString(),
      p_source_type: 'user_form',
      p_payload: { wet_weight_kg: wet, dry_weight_kg: dry },
      p_title: 'Harvest',
    });
    if (eErr) return res.status(500).json({ error: 'harvest_event_failed', detail: eErr.message });
    const eventId = (event as { event?: { id?: string } } | null)?.event?.id ?? null;
    const { data, error } = await supabase
      .from('harvest_records')
      .insert({
        farm_id: farmId,
        cycle_id: cycleId,
        scope_id: scopeId,
        wet_weight_kg: wet,
        dry_weight_kg: dry,
        event_id: eventId,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: 'harvest_failed', detail: error.message });
    return res.status(201).json({ ok: true, harvest: data });
  }

  if (action === 'qc') {
    const testType = typeof req.body?.testType === 'string' ? req.body.testType.trim() : '';
    if (!testType) return res.status(400).json({ error: 'missing_params' });
    const { data, error } = await supabase
      .from('qc_results')
      .insert({
        farm_id: farmId,
        cycle_id: typeof req.body?.cycleId === 'string' ? req.body.cycleId : null,
        batch_code: typeof req.body?.batchCode === 'string' ? req.body.batchCode : null,
        lab_name: typeof req.body?.labName === 'string' ? req.body.labName : null,
        test_type: testType,
        passed: typeof req.body?.passed === 'boolean' ? req.body.passed : null,
        result_json: { note: typeof req.body?.note === 'string' ? req.body.note : '' },
      })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: 'qc_failed', detail: error.message });
    return res.status(201).json({ ok: true, qc: data });
  }

  if (action === 'training_ack') {
    const sopRevisionId = typeof req.body?.sopRevisionId === 'string' ? req.body.sopRevisionId : '';
    if (!sopRevisionId) return res.status(400).json({ error: 'missing_params' });
    const { data, error } = await supabase
      .from('training_records')
      .upsert(
        {
          farm_id: farmId,
          user_id: user.id,
          sop_revision_id: sopRevisionId,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: 'farm_id,user_id,sop_revision_id' }
      )
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: 'training_failed', detail: error.message });
    return res.status(201).json({ ok: true, training: data });
  }

  return res.status(400).json({ error: 'unknown_action' });
}
