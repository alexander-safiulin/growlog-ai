import { describe, expect, it } from 'vitest';

import {
  STORED_PHOTO_MAX_EDGE_PX,
  storedPhotoNeedsReencode,
  storedPhotoResize,
} from '@growlog/domain';

describe('stored photo size', () => {
  it('shrinks the long edge and keeps portrait orientation', () => {
    expect(storedPhotoResize(3024, 4032)).toEqual({ height: STORED_PHOTO_MAX_EDGE_PX });
    expect(storedPhotoResize(4032, 3024)).toEqual({ width: STORED_PHOTO_MAX_EDGE_PX });
  });

  it('leaves a frame that already fits', () => {
    expect(storedPhotoResize(1080, 1920)).toBeNull();
    expect(storedPhotoResize(0, 0)).toBeNull();
  });

  it('skips a second pass for a small jpeg and reencodes a large original', () => {
    expect(
      storedPhotoNeedsReencode({
        mimeType: 'image/jpeg',
        fileName: 'plant.jpg',
        fileSize: 400_000,
        width: 1536,
        height: 2048,
      }),
    ).toBe(false);
    expect(
      storedPhotoNeedsReencode({
        mimeType: 'image/jpeg',
        fileName: 'IMG_0001.jpg',
        fileSize: 12_000_000,
        width: 3024,
        height: 4032,
      }),
    ).toBe(true);
    expect(
      storedPhotoNeedsReencode({
        mimeType: 'image/heic',
        fileName: 'IMG_0001.HEIC',
        fileSize: 400_000,
        width: 800,
        height: 600,
      }),
    ).toBe(true);
  });
});
