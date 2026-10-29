import { enqueuePhotoCapture } from '@/lib/offline-queue';
import {
  createPhotoCaptureUpload,
  formatPhotoSizeLimit,
  getMaxPhotoBytesVisionClient,
} from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';

export type PhotoPickResult = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export async function pickPhotoFromDevice(
  source: 'camera' | 'library',
): Promise<PhotoPickResult | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('permission_required');
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, exif: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, exif: false });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  let fileSize = asset.fileSize ?? 0;
  if (fileSize <= 0) {
    const probe = await fetch(asset.uri);
    const probeBuf = await probe.arrayBuffer();
    fileSize = probeBuf.byteLength;
  }

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileSize,
  };
}

export async function uploadPhotoCapture(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    pick: PhotoPickResult;
    caption?: string;
    capturedAt?: string;
    userId?: string | null;
    offlineOk?: boolean;
  }
): Promise<
  | { status: 'uploaded'; eventId: string; mediaAssetId: string; storagePath: string }
  | { status: 'queued' }
> {
  const maxBytes = getMaxPhotoBytesVisionClient();
  if (params.pick.fileSize > maxBytes) {
    throw new Error(
      `File too large (${formatPhotoSizeLimit(params.pick.fileSize)}). Max ${formatPhotoSizeLimit(maxBytes)}.`
    );
  }

  const net = await NetInfo.fetch();
  const offline = net.isConnected === false || net.isInternetReachable === false;

  if (offline && params.offlineOk !== false) {
    await enqueuePhotoCapture({
      farmId: params.farmId,
      cycleId: params.cycleId,
      scopeId: params.scopeId,
      localUri: params.pick.uri,
      fileName: params.pick.fileName,
      mimeType: params.pick.mimeType,
      fileSize: params.pick.fileSize,
      caption: params.caption,
      capturedAt: params.capturedAt,
      userId: params.userId,
    });
    return { status: 'queued' };
  }

  const res = await fetch(params.pick.uri);
  const buf = await res.arrayBuffer();
  const fileSize = params.pick.fileSize > 0 ? params.pick.fileSize : buf.byteLength;
  try {
    const finalized = await createPhotoCaptureUpload(supabase, {
      farmId: params.farmId,
      cycleId: params.cycleId,
      scopeId: params.scopeId,
      bytes: buf,
      fileName: params.pick.fileName,
      mimeType: params.pick.mimeType,
      fileSize,
      caption: params.caption,
      capturedAt: params.capturedAt,
      userId: params.userId,
    });
    const eventId = finalized.event.id;
    const mediaAssetId = finalized.asset.id;
    const storagePath = finalized.asset.storage_path;
    if (
      typeof eventId !== 'string' ||
      typeof mediaAssetId !== 'string' ||
      typeof storagePath !== 'string'
    ) {
      throw new Error('Photo capture response incomplete');
    }
    return { status: 'uploaded', eventId, mediaAssetId, storagePath };
  } catch (err) {
    if (params.offlineOk === false) throw err;
    await enqueuePhotoCapture({
      farmId: params.farmId,
      cycleId: params.cycleId,
      scopeId: params.scopeId,
      localUri: params.pick.uri,
      fileName: params.pick.fileName,
      mimeType: params.pick.mimeType,
      fileSize,
      caption: params.caption,
      capturedAt: params.capturedAt,
      userId: params.userId,
    });
    return { status: 'queued' };
  }
}
