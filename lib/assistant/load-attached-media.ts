import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_PHOTO_BYTES_VISION } from '@/lib/growlog/photo-constants';

export type AttachedMediaForAsk = {
  mediaAssetId: string;
  dataUrl: string;
  capturedAt: string | null;
  fileName: string | null;
};

export async function loadAttachedMediaForAsk(
  supabase: SupabaseClient,
  params: { farmId: string; mediaAssetId: string }
): Promise<AttachedMediaForAsk | null> {
  const { data: asset, error } = await supabase
    .from('media_assets')
    .select(
      'id, farm_id, storage_bucket, storage_path, mime_type, media_type, captured_at, file_name, file_size'
    )
    .eq('id', params.mediaAssetId)
    .eq('farm_id', params.farmId)
    .maybeSingle();

  if (error) throw error;
  if (!asset || asset.media_type !== 'image') return null;

  if (asset.file_size != null && Number(asset.file_size) > MAX_PHOTO_BYTES_VISION) {
    throw new Error('attached_photo_too_large');
  }

  const { data: file, error: dlErr } = await supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);
  if (dlErr || !file) {
    throw new Error(dlErr?.message || 'storage download failed');
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_PHOTO_BYTES_VISION) {
    throw new Error('attached_photo_too_large');
  }

  const mime = asset.mime_type || 'image/jpeg';
  return {
    mediaAssetId: asset.id as string,
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
    capturedAt: (asset.captured_at as string | null) ?? null,
    fileName: (asset.file_name as string | null) ?? null,
  };
}
