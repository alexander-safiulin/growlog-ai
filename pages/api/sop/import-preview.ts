import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { extractDocumentText } from '@/lib/growlog/document-text';
import {
  assertFarmReadable,
  farmHasSopImportWithContentHash,
} from '@/lib/growlog/sop-import-api-guards';
import { hashSopImportSourceText } from '@/lib/growlog/sop-import-content-hash';
import { classifySopDocumentText } from '@/lib/growlog/sop-import-classifier';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
};

function resolveText(req: NextApiRequest): { text: string; sourceLabel: string } | { error: string } {
  const textBody = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (textBody.length >= 40) {
    return { text: textBody.slice(0, 500_000), sourceLabel: 'paste' };
  }

  const fileBase64 = typeof req.body?.fileBase64 === 'string' ? req.body.fileBase64 : '';
  const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'application/octet-stream';
  const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : 'document';

  if (!fileBase64) {
    return { error: textBody.length > 0 ? 'text_too_short' : 'missing_content' };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(fileBase64, 'base64');
  } catch {
    return { error: 'invalid_file_encoding' };
  }

  const extracted = extractDocumentText(bytes, mimeType);
  if (extracted.length < 40) {
    return { error: 'no_extractable_text' };
  }

  return {
    text: extracted.slice(0, 500_000),
    sourceLabel: fileName || mimeType,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });

  const farmId = typeof req.body?.farmId === 'string' ? req.body.farmId : '';
  if (!farmId) return res.status(400).json({ error: 'missing_params' });

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    await assertFarmReadable(supabase, farmId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'farm_check_failed';
    if (msg === 'farm_not_found') return res.status(404).json({ error: msg });
    return res.status(500).json({ error: 'farm_check_failed', detail: msg });
  }

  const resolved = resolveText(req);
  if ('error' in resolved) {
    const code = resolved.error;
    const status = code === 'no_extractable_text' ? 422 : 400;
    return res.status(status).json({ error: code });
  }

  try {
    const contentHash = hashSopImportSourceText(resolved.text);
    let duplicateDocument = false;
    try {
      duplicateDocument = await farmHasSopImportWithContentHash(supabase, farmId, contentHash);
    } catch {
      duplicateDocument = false;
    }
    const preview = await classifySopDocumentText(resolved.text);
    return res.status(200).json({
      ok: true,
      sourceText: resolved.text,
      sourceLabel: resolved.sourceLabel,
      contentHash,
      duplicateDocument,
      ...preview,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'preview_failed';
    if (msg === 'openai_not_configured') return res.status(503).json({ error: msg });
    if (msg === 'empty_model_response') return res.status(502).json({ error: msg });
    if (msg === 'invalid_classifier_json') return res.status(422).json({ error: msg });
    return res.status(500).json({ error: 'preview_failed', detail: msg });
  }
}
