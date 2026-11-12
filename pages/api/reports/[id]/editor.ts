import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { extractEditorPutPayload, parseEditorLayer } from '@growlog/domain';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const reportId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!reportId) return res.status(400).json({ error: 'missing_report_id' });

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const { farmId: farmIdFromClient, editorInput } = extractEditorPutPayload(req.body);
  if (!farmIdFromClient) {
    return res.status(400).json({ error: 'missing_farm_id' });
  }

  const parsed = parseEditorLayer(editorInput);
  if (!parsed.ok) {
    return res.status(400).json({ error: 'invalid_editor_json', detail: parsed.error });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase
    .from('reports')
    .update({ editor_json: parsed.editor as unknown as Record<string, unknown> })
    .eq('id', reportId)
    .eq('farm_id', farmIdFromClient)
    .select('id, farm_id, updated_at')
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'update_failed', detail: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'report_not_found' });
  }

  return res.status(200).json({ ok: true, reportId: data.id, updatedAt: data.updated_at });
}
