import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { registerDocumentMediaAsset } from '@/lib/growlog/register-document-asset';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const MAX_BYTES = 8 * 1024 * 1024;

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
  const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : '';
  const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'application/octet-stream';
  const fileBase64 = typeof req.body?.fileBase64 === 'string' ? req.body.fileBase64 : '';
  const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : null;

  if (!farmId || !fileName || !fileBase64) {
    return res.status(400).json({ error: 'missing_params' });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(fileBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'invalid_base64' });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return res.status(413).json({ error: 'file_too_large', max_bytes: MAX_BYTES });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const asset = await registerDocumentMediaAsset(supabase, {
      farmId,
      userId: user.id,
      fileName,
      mimeType,
      bytes,
      cycleId,
    });
    return res.status(201).json({ ok: true, mediaAssetId: asset.id, storagePath: asset.storage_path });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'upload_failed';
    return res.status(500).json({ error: 'upload_failed', detail: msg });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
};
