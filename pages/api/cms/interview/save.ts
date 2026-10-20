import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Answer = { question?: string; answer?: string };

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
  const stage = typeof req.body?.stage === 'string' ? req.body.stage : '';
  const answers = Array.isArray(req.body?.answers) ? (req.body.answers as Answer[]) : [];
  if (!farmId || !stage) return res.status(400).json({ error: 'missing_params' });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: member } = await supabase
    .from('farm_users')
    .select('role')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member || (member.role !== 'admin' && member.role !== 'manager')) {
    return res.status(403).json({ error: 'approver_required' });
  }

  const filled = answers.filter((a) => (a.answer ?? '').trim() && (a.question ?? '').trim());
  const complete = answers.length > 0 && filled.length === answers.length;

  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('id')
    .eq('farm_id', farmId)
    .eq('slug', 'farm-playbook')
    .maybeSingle();
  let sourceId = source?.id as string | undefined;
  if (!sourceId) {
    const { data: created, error: sErr } = await supabase
      .from('knowledge_sources')
      .insert({
        farm_id: farmId,
        slug: 'farm-playbook',
        title: 'Farm playbook',
        source_type: 'internal',
        is_global: false,
      })
      .select('id')
      .single();
    if (sErr) return res.status(500).json({ error: 'source_failed', detail: sErr.message });
    sourceId = created.id as string;
  }

  const draftIds: string[] = [];
  for (let i = 0; i < filled.length; i++) {
    const row = filled[i]!;
    const body = `Q: ${row.question}\nA: ${row.answer}`;
    const slug = `interview-${stage}-${Date.now()}-${i}`;
    const { data: item, error: iErr } = await supabase
      .from('knowledge_items')
      .insert({
        source_id: sourceId,
        farm_id: farmId,
        slug,
        title: String(row.question).slice(0, 80),
        body,
        status: 'draft',
        metadata: { stage, origin: 'interview' },
      })
      .select('id')
      .single();
    if (iErr) return res.status(500).json({ error: 'draft_failed', detail: iErr.message });
    draftIds.push(item.id as string);
  }

  const { data: session, error: sessErr } = await supabase
    .from('interview_sessions')
    .insert({
      farm_id: farmId,
      stage,
      status: complete ? 'completed' : 'in_progress',
      conducted_by: user.id,
      answers_json: answers,
      draft_knowledge_ids: draftIds,
    })
    .select('id, status')
    .single();
  if (sessErr) return res.status(500).json({ error: 'session_failed', detail: sessErr.message });

  const { data: sessions } = await supabase
    .from('interview_sessions')
    .select('stage, status')
    .eq('farm_id', farmId);
  const covered = new Set(
    (sessions ?? []).filter((s) => s.status === 'completed').map((s) => s.stage as string)
  );

  return res.status(201).json({
    ok: true,
    session,
    draftIds,
    coveredStages: [...covered],
  });
}
