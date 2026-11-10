import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { commitSopDocumentImport } from '@growlog/domain/growlog/sop-mutations';
import {
  sanitizeSopImportDraft,
  type SopImportDefinitionDraft,
} from '@growlog/domain/growlog/sop-import-draft';
import {
  assertCycleScopeForFarm,
  assertFarmReadable,
  farmHasSopImportWithContentHash,
} from '@/lib/growlog/sop-import-api-guards';
import { hashSopImportSourceText } from '@/lib/growlog/sop-import-content-hash';
import { matchSopImportErrorCode } from '@/lib/growlog/sop-import-errors';

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
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
  const scopeId = typeof req.body?.scopeId === 'string' ? req.body.scopeId : '';
  const sourceText = typeof req.body?.sourceText === 'string' ? req.body.sourceText : '';
  const sourceTitle =
    typeof req.body?.sourceTitle === 'string' ? req.body.sourceTitle.trim() : 'Imported SOP';
  const rawDrafts = req.body?.drafts;
  const allowDuplicate = req.body?.allowDuplicate === true;

  if (!farmId || !cycleId || !scopeId || !sourceText || !Array.isArray(rawDrafts)) {
    return res.status(400).json({ error: 'missing_params' });
  }

  const selected = rawDrafts.filter(
    (d: unknown) => d && typeof d === 'object' && (d as { selected?: unknown }).selected !== false
  );

  const drafts: SopImportDefinitionDraft[] = [];
  for (const raw of selected) {
    const row =
      raw && typeof raw === 'object' && 'draft' in (raw as object)
        ? (raw as { draft: unknown }).draft
        : raw;
    const sanitized = sanitizeSopImportDraft(row);
    if (sanitized) drafts.push(sanitized);
  }

  if (!drafts.length) {
    return res.status(400).json({ error: 'no_drafts' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    await assertFarmReadable(supabase, farmId);
    await assertCycleScopeForFarm(supabase, { farmId, cycleId, scopeId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'access_check_failed';
    const status =
      msg === 'farm_not_found' || msg === 'cycle_not_found' || msg === 'invalid_scope'
        ? 404
        : msg === 'cycle_scope_mismatch'
          ? 400
          : 500;
    return res.status(status).json({ error: msg });
  }

  if (sourceText.trim().length < 40) {
    return res.status(400).json({ error: 'source_text_too_short' });
  }

  const contentHash = hashSopImportSourceText(sourceText);
  if (!allowDuplicate) {
    try {
      const dup = await farmHasSopImportWithContentHash(supabase, farmId, contentHash);
      if (dup) return res.status(409).json({ error: 'duplicate_document', code: 'duplicate_document' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'duplicate_check_failed';
      return res.status(500).json({ error: 'duplicate_check_failed', detail: msg });
    }
  }

  try {
    const result = await commitSopDocumentImport(supabase, {
      farmId,
      cycleId,
      scopeId,
      sourceText,
      sourceTitle,
      sourceContentHash: contentHash,
      allowDuplicate,
      createdBy: user.id,
      drafts,
    });
    return res.status(201).json({ ok: true, ...result });
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : 'commit_failed';
    const msg = matchSopImportErrorCode(raw) ?? 'commit_failed';
    if (msg === 'duplicate_document') {
      return res.status(409).json({ error: msg, code: msg });
    }
    const notFound = new Set(['farm_not_found', 'cycle_not_found', 'invalid_scope']);
    const clientErrors = new Set([
      'no_drafts',
      'validation_error',
      'invalid_trigger_type',
      'invalid_local_time',
      'invalid_interval_days',
      'missing_dates',
      'missing_stages',
      'invalid_offset_days',
      'invalid_window_end',
      'trigger_config_must_be_object',
      'unsupported_trigger_type',
      'invalid_weekdays',
      'invalid_month_days',
      'invalid_stage_when',
      'invalid_stage',
      'source_text_too_short',
      'cycle_scope_mismatch',
      'missing_applies_to_scope',
      'unauthorized',
    ]);
    const status = notFound.has(msg) ? 404 : clientErrors.has(msg) ? 400 : 500;
    return res.status(status).json({
      error: msg,
      ...(msg === 'commit_failed' ? { detail: raw } : {}),
    });
  }
}
