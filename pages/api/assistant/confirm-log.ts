import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import type { ChatExtractedEvent, ChatExtractedReading } from '@/lib/chat/extraction-schema';
import {
  checkThresholdViolations,
  maybeCreateDeviationFromEvent,
} from '@/lib/growlog/deviation-engine';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Body = {
  farmId?: string;
  cycleId?: string | null;
  scopeId?: string | null;
  events?: ChatExtractedEvent[];
  readings?: ChatExtractedReading[];
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
  if (!body.scopeId) return res.status(400).json({ error: 'missing_scope_id' });

  const events = Array.isArray(body.events) ? body.events : [];
  const readings = Array.isArray(body.readings) ? body.readings : [];
  if (events.length === 0 && readings.length === 0) {
    return res.status(400).json({ error: 'nothing_to_persist' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const createdEventIds: string[] = [];
  for (const ev of events) {
    const occurredAt = ev.occurred_at_iso?.trim() || new Date().toISOString();
    if (!body.cycleId) {
      return res.status(400).json({ error: 'missing_cycle_id' });
    }
    const { data, error } = await supabase.rpc('create_log_entry', {
      p_farm_id: body.farmId,
      p_cycle_id: body.cycleId,
      p_scope_id: body.scopeId,
      p_event_type: ev.event_type,
      p_body: ev.body,
      p_occurred_at: occurredAt,
      p_source_type: 'chat_extract',
      p_payload: { confirmed_by: user.id },
      p_title: ev.title,
    });
    if (error) {
      return res.status(500).json({ error: 'create_log_entry_failed', detail: error.message });
    }
    const eventRow = (data as { event?: { id?: string; event_type?: string } } | null)?.event;
    if (eventRow?.id) {
      createdEventIds.push(eventRow.id);
      await maybeCreateDeviationFromEvent(supabase, {
        farmId: body.farmId,
        cycleId: body.cycleId ?? null,
        scopeId: body.scopeId,
        eventId: eventRow.id,
        eventType: eventRow.event_type ?? ev.event_type,
        title: ev.title,
        body: ev.body,
      }).catch(() => null);
    }
  }

  const { data: cycleRow } = await supabase
    .from('grow_cycles')
    .select('stage')
    .eq('id', body.cycleId!)
    .maybeSingle();

  const createdReadingIds: string[] = [];
  for (const r of readings) {
    const { data: metric } = await supabase
      .from('sensor_metrics')
      .select('id')
      .eq('metric_code', r.metric_code)
      .maybeSingle();
    if (!metric?.id) continue;
    const capturedAt = r.captured_at_iso?.trim() || new Date().toISOString();
    const { data: reading, error } = await supabase
      .from('sensor_readings')
      .insert({
        farm_id: body.farmId,
        cycle_id: body.cycleId ?? null,
        scope_id: body.scopeId,
        metric_id: metric.id,
        value_numeric: r.value,
        captured_at: capturedAt,
        source_type: 'manual',
      })
      .select('id')
      .single();
    if (error) {
      return res.status(500).json({ error: 'reading_insert_failed', detail: error.message });
    }
    if (reading?.id) {
      createdReadingIds.push(reading.id as string);
      await checkThresholdViolations(supabase, {
        farmId: body.farmId,
        cycleId: body.cycleId ?? null,
        scopeId: body.scopeId,
        metricCode: r.metric_code,
        value: r.value,
        cycleStage: (cycleRow?.stage as string | undefined) ?? null,
      }).catch(() => null);
    }
  }

  return res.status(201).json({
    ok: true,
    eventIds: createdEventIds,
    readingIds: createdReadingIds,
  });
}
