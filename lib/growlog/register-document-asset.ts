import type { SupabaseClient } from '@supabase/supabase-js';

function mediaTypeForMime(mimeType: string, fileName: string): 'pdf' | 'html_snapshot' {
  const m = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  if (m.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  return 'html_snapshot';
}

export async function registerDocumentMediaAsset(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    bytes: Buffer | Uint8Array;
    cycleId?: string | null;
  }
) {
  const safeName = params.fileName.replace(/[^\w.-]/g, '_');
  const path = `${params.farmId}/${crypto.randomUUID()}-${safeName}`;
  const mediaType = mediaTypeForMime(params.mimeType, params.fileName);
  const body = params.bytes instanceof Buffer ? params.bytes : Buffer.from(params.bytes);

  const { error: upErr } = await supabase.storage.from('media').upload(path, body, {
    cacheControl: '3600',
    upsert: false,
    contentType: params.mimeType || 'application/octet-stream',
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId ?? null,
      uploaded_by: params.userId,
      storage_bucket: 'media',
      storage_path: path,
      media_type: mediaType,
      mime_type: params.mimeType || 'application/octet-stream',
      file_name: params.fileName,
      file_size: body.byteLength,
      metadata: { document_upload: true },
    })
    .select('id, storage_path')
    .single();
  if (error) {
    await supabase.storage.from('media').remove([path]).catch(() => undefined);
    throw error;
  }
  return data as { id: string; storage_path: string };
}
