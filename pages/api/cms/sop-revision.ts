import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { assertFarmApprover } from '@/lib/growlog/farm-access';
import { approveSopRevision, proposeSopRevision } from '@growlog/domain';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const LOCALES = new Set(['en', 'ru', 'th', 'my']);

async function requireApprover(
  supabase: unknown,
  farmId: string,
  userId: string,
  res: NextApiResponse
): Promise<boolean> {
  try {
    await assertFarmApprover(supabase as SupabaseClient, farmId, userId);
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'approver_required';
    if (msg === 'approver_required') {
      res.status(403).json({ error: 'approver_required' });
      return false;
    }
    res.status(500).json({ error: 'role_check_failed', detail: msg });
    return false;
  }
}

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

  if (action === 'propose') {
    const sopDefinitionId = typeof req.body?.sopDefinitionId === 'string' ? req.body.sopDefinitionId : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const bodyText = typeof req.body?.bodyText === 'string' ? req.body.bodyText.trim() : '';
    if (!sopDefinitionId || !title || !reason || !bodyText) {
      return res.status(400).json({ error: 'missing_params' });
    }
    try {
      const created = await proposeSopRevision(supabase as unknown as SupabaseClient, {
        farmId,
        sopDefinitionId,
        title,
        bodyJson: { text: bodyText },
        instructionsJson: bodyText
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean),
        reason,
        proposedBy: user.id,
      });
      return res.status(201).json({ ok: true, revision: created });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'propose_failed';
      return res.status(500).json({ error: 'propose_failed', detail: msg });
    }
  }

  if (action === 'approve') {
    if (!(await requireApprover(supabase, farmId, user.id, res))) return;
    const revisionId = typeof req.body?.revisionId === 'string' ? req.body.revisionId : '';
    if (!revisionId) return res.status(400).json({ error: 'missing_params' });
    try {
      const rev = await approveSopRevision(supabase as unknown as SupabaseClient, {
        revisionId,
        farmId,
        approvedBy: user.id,
      });
      return res.status(200).json({ ok: true, revision: rev });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'approve_failed';
      const status = msg === 'approver_required' ? 403 : 500;
      return res.status(status).json({ error: msg });
    }
  }

  if (action === 'translate') {
    const revisionId = typeof req.body?.revisionId === 'string' ? req.body.revisionId : '';
    const locale = typeof req.body?.locale === 'string' ? req.body.locale : '';
    if (!revisionId || !LOCALES.has(locale)) return res.status(400).json({ error: 'missing_params' });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'openai_not_configured' });

    const { data: rev, error } = await supabase
      .from('sop_revisions')
      .select('id, title, body_json, instructions_json')
      .eq('id', revisionId)
      .eq('farm_id', farmId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'lookup_failed', detail: error.message });
    if (!rev) return res.status(404).json({ error: 'revision_not_found' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Translate the SOP into the requested locale. Return JSON {"title":"","body":""}. Keep numbers and units. Mark nothing as approved. Burmese must be Unicode, not Zawgyi.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            locale,
            title: rev.title,
            body: rev.body_json,
            instructions: rev.instructions_json,
          }),
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: 'empty_model_response' });
    const parsed = JSON.parse(raw) as { title?: string; body?: string };
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const bodyText = typeof parsed.body === 'string' ? parsed.body.trim() : '';
    if (!title || !bodyText) return res.status(422).json({ error: 'invalid_translation' });

    const { data: saved, error: sErr } = await supabase
      .from('sop_revision_translations')
      .upsert(
        {
          farm_id: farmId,
          sop_revision_id: revisionId,
          locale,
          title,
          body_text: bodyText,
          translation_status: 'machine',
          approved_by: null,
          approved_at: null,
        },
        { onConflict: 'sop_revision_id,locale' }
      )
      .select('id, translation_status')
      .single();
    if (sErr) return res.status(500).json({ error: 'save_failed', detail: sErr.message });
    return res.status(200).json({ ok: true, translation: saved });
  }

  if (action === 'approve_translation') {
    if (!(await requireApprover(supabase, farmId, user.id, res))) return;
    const translationId = typeof req.body?.translationId === 'string' ? req.body.translationId : '';
    if (!translationId) return res.status(400).json({ error: 'missing_params' });
    const { data, error } = await supabase
      .from('sop_revision_translations')
      .update({
        translation_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', translationId)
      .eq('farm_id', farmId)
      .select('id, locale, translation_status')
      .single();
    if (error) return res.status(500).json({ error: 'approve_failed', detail: error.message });
    return res.status(200).json({ ok: true, translation: data });
  }

  return res.status(400).json({ error: 'unknown_action' });
}
