import { VOICE_EXTRACTABLE_EVENT_TYPES } from '@/lib/voice/extractable-event-types';

const allowedEvents = new Set<string>(VOICE_EXTRACTABLE_EVENT_TYPES);

export type ChatExtractedEvent = {
  event_type: string;
  body: string;
  title: string | null;
  occurred_at_iso: string | null;
};

export type ChatExtractedReading = {
  metric_code: string;
  value: number;
  captured_at_iso: string | null;
};

export type ChatExtractionResult = {
  events: ChatExtractedEvent[];
  readings: ChatExtractedReading[];
};

export function parseChatExtractionJson(raw: string): ChatExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid_json');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('empty_response');
  const o = parsed as Record<string, unknown>;
  const eventsRaw = Array.isArray(o.events) ? o.events : [];
  const readingsRaw = Array.isArray(o.readings) ? o.readings : [];

  const events: ChatExtractedEvent[] = [];
  for (const item of eventsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const event_type = row.event_type;
    const body = row.body;
    if (typeof event_type !== 'string' || !allowedEvents.has(event_type)) continue;
    if (typeof body !== 'string' || !body.trim()) continue;
    const title =
      row.title === null || row.title === undefined ? null : String(row.title).trim() || null;
    const occurred =
      row.occurred_at_iso === null || row.occurred_at_iso === undefined
        ? null
        : String(row.occurred_at_iso);
    if (occurred && Number.isNaN(Date.parse(occurred))) continue;
    events.push({
      event_type,
      body: body.trim(),
      title,
      occurred_at_iso: occurred,
    });
  }

  const readings: ChatExtractedReading[] = [];
  for (const item of readingsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const metric_code = row.metric_code;
    const value = typeof row.value === 'number' ? row.value : Number(row.value);
    if (typeof metric_code !== 'string' || !metric_code.trim() || Number.isNaN(value)) continue;
    const captured =
      row.captured_at_iso === null || row.captured_at_iso === undefined
        ? null
        : String(row.captured_at_iso);
    if (captured && Number.isNaN(Date.parse(captured))) continue;
    readings.push({
      metric_code: metric_code.trim(),
      value,
      captured_at_iso: captured,
    });
  }

  return { events, readings };
}
