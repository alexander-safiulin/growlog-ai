import {
  STORED_PHOTO_JPEG_QUALITY,
  storedPhotoNeedsReencode,
  storedPhotoResize,
} from '@growlog/domain';
import { Image } from 'react-native';

type ManipulatorModule = typeof import('expo-image-manipulator');

function getImageManipulatorModule(): ManipulatorModule | null {
  try {
    // Lazy load: dev clients built before this native module was added must not crash at import.
    return require('expo-image-manipulator') as ManipulatorModule;
  } catch {
    return null;
  }
}

function imageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve(width > 0 && height > 0 ? { width, height } : null),
      () => resolve(null),
    );
  });
}

async function fileBytes(uri: string): Promise<number> {
  const probe = await fetch(uri);
  const buf = await probe.arrayBuffer();
  return buf.byteLength;
}

export async function preparePhotoForStorage(pick: {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}): Promise<{ uri: string; fileName: string; mimeType: string; fileSize: number }> {
  const size = await imageSize(pick.uri);
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  if (
    !storedPhotoNeedsReencode({
      mimeType: pick.mimeType,
      fileName: pick.fileName,
      fileSize: pick.fileSize,
      width,
      height,
    })
  ) {
    return pick;
  }

  const manipulator = getImageManipulatorModule();
  if (!manipulator) {
    return pick;
  }

  try {
    const context = manipulator.ImageManipulator.manipulate(pick.uri);
    const resize = storedPhotoResize(width, height);
    if (resize) context.resize(resize);
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      compress: STORED_PHOTO_JPEG_QUALITY,
      format: manipulator.SaveFormat.JPEG,
    });
    const base = pick.fileName.replace(/\.[^.]+$/, '') || `photo-${Date.now()}`;
    return {
      uri: saved.uri,
      fileName: `${base}.jpg`,
      mimeType: 'image/jpeg',
      fileSize: await fileBytes(saved.uri),
    };
  } catch {
    return pick;
  }
}
