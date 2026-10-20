import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getUserFromBearer } from '@/lib/api/auth-from-request';
import { parseChatExtractionJson } from '@/lib/chat/extraction-schema';
import { VOICE_EXTRACTABLE_EVENT_TYPES } from '@/lib/voice/extractable-event-types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `Extract structured farm log items from a chat message. Return ONLY JSON:
{
  "events": [
    { "event_type": "<snake_case>", "body": "<facts>", "title": null or string, "occurred_at_iso": null or ISO8601 }
  ],
  "readings": [
    { "metric_code": "<code>", "value": number, "captured_at_iso": null or ISO8601 }
  ]
}

Allowed event_type values: ${VOICE_EXTRACTABLE_EVENT_TYPES.join(', ')}.
Common metric_code: air_temp_c, air_rh_pct, co2_ppm, ec_mS_cm, ph, vpd_kpa.
Rules:
- Do not invent facts not stated in the message.
- Empty arrays if nothing to extract.
- Multiple events allowed when the message describes several actions.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'openai_not_configured' });
  }
  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'missing_message' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: message },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: 'empty_model_response' });
    const parsed = parseChatExtractionJson(raw);
    return res.status(200).json({ ...parsed, model: 'gpt-4o-mini' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'extraction_failed';
    return res.status(422).json({ error: 'extraction_failed', detail: msg });
  }
}
