import { createLogEntry, createPhotoCaptureUpload } from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getOfflineQueue,
  markQueueItemFailed,
  removeQueueItem,
  requeueItem,
  type PendingCapture,
} from '@/lib/offline-queue';

export type SyncedOfflinePhoto = {
  queueItemId: string;
  eventId: string;
  mediaAssetId: string;
  leafCapture?: boolean;
};

export type FlushOfflineQueueResult = {
  synced: number;
  failed: number;
  syncedPhotos: SyncedOfflinePhoto[];
};

type SyncOneResult =
  | { ok: true; kind: 'log' }
  | { ok: true; kind: 'photo'; eventId: string; mediaAssetId: string; leafCapture?: boolean }
  | { ok: false };

function parsePhotoUploadResult(data: {
  event: Record<string, unknown>;
  asset: Record<string, unknown>;
}): { eventId: string; mediaAssetId: string } | null {
  const eventId = data.event.id;
  const mediaAssetId = data.asset.id;
  if (typeof eventId !== 'string' || typeof mediaAssetId !== 'string') return null;
  return { eventId, mediaAssetId };
}

async function syncOne(supabase: SupabaseClient, item: PendingCapture): Promise<SyncOneResult> {
  try {
    if (item.kind === 'log') {
      const p = item.payload;
      await createLogEntry(supabase, {
        farmId: p.farmId,
        cycleId: p.cycleId,
        scopeId: p.scopeId,
        eventType: p.eventType,
        body: p.body,
        occurredAt: p.occurredAt,
        sourceType: p.sourceType,
        createdBy: p.createdBy,
        clientRequestId:
          typeof p.payload?.client_request_id === 'string' ? p.payload.client_request_id : null,
        payload: p.payload,
      });
      await removeQueueItem(item.id);
      return { ok: true, kind: 'log' };
    }
    const p = item.payload;
    const res = await fetch(p.localUri);
    const buf = await res.arrayBuffer();
    const fileSize = p.fileSize > 0 ? p.fileSize : buf.byteLength;
    const finalized = await createPhotoCaptureUpload(supabase, {
      farmId: p.farmId,
      cycleId: p.cycleId,
      scopeId: p.scopeId,
      bytes: buf,
      fileName: p.fileName,
      mimeType: p.mimeType,
      fileSize,
      caption: p.caption,
      capturedAt: p.capturedAt,
      userId: p.userId,
    });
    const ids = parsePhotoUploadResult(finalized);
    if (!ids) throw new Error('Photo capture response incomplete');
    await removeQueueItem(item.id);
    return {
      ok: true,
      kind: 'photo',
      eventId: ids.eventId,
      mediaAssetId: ids.mediaAssetId,
      leafCapture: p.leafCapture === true,
    };
  } catch {
    await markQueueItemFailed(item.id);
    return { ok: false };
  }
}

export async function flushOfflineQueue(supabase: SupabaseClient): Promise<FlushOfflineQueueResult> {
  const items = await getOfflineQueue();
  let synced = 0;
  let failed = 0;
  const syncedPhotos: SyncedOfflinePhoto[] = [];
  for (const item of items.filter((i) => i.retryCount < 5)) {
    if (item.status === 'failed') {
      await requeueItem(item.id);
    }
    const outcome = await syncOne(supabase, item);
    if (outcome.ok) {
      synced += 1;
      if (outcome.kind === 'photo') {
        syncedPhotos.push({
          queueItemId: item.id,
          eventId: outcome.eventId,
          mediaAssetId: outcome.mediaAssetId,
          leafCapture: outcome.leafCapture,
        });
      }
    } else {
      failed += 1;
    }
  }
  return { synced, failed, syncedPhotos };
}
