import type { PhotoPickResult } from '@/lib/photo-upload';
import { uploadPhotoCapture } from '@/lib/photo-upload';
import type { SupabaseClient } from '@supabase/supabase-js';
import { findReusablePhotoCapture, linkMediaToEvent } from '@growlog/domain';

export async function attachPhotoToLogEvent(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    parentEventId: string;
    pick: PhotoPickResult;
    caption: string;
    capturedAt: string;
    userId: string | null | undefined;
  },
) {
  let uploaded = await findReusablePhotoCapture(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    body: params.caption,
    occurredAt: params.capturedAt,
    parentEventId: params.parentEventId,
  });

  if (!uploaded) {
    const photoOutcome = await uploadPhotoCapture(supabase, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      scopeId: params.scopeId,
      pick: params.pick,
      caption: params.caption,
      capturedAt: params.capturedAt,
      userId: params.userId,
      offlineOk: false,
    });
    if (photoOutcome.status !== 'uploaded') {
      throw new Error('photo_attach_failed');
    }
    uploaded = {
      eventId: photoOutcome.eventId,
      mediaAssetId: photoOutcome.mediaAssetId,
    };
  }

  await linkMediaToEvent(supabase, {
    farmId: params.farmId,
    parentEventId: params.parentEventId,
    mediaAssetId: uploaded.mediaAssetId,
    photoEventId: uploaded.eventId,
  });
}

export function mapLogPhotoAttachError(
  e: unknown,
  copy: { procedurePhotoAttachFailed: string },
  fallback?: string,
): string {
  const message = e instanceof Error ? e.message : fallback ?? copy.procedurePhotoAttachFailed;
  const lower = message.toLowerCase();
  if (message === 'photo_attach_failed' || lower.includes('link_media_to_event')) {
    return copy.procedurePhotoAttachFailed;
  }
  return message;
}
