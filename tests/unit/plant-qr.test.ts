import { describe, expect, it } from 'vitest';

import { buildPlantQrUrl, parsePlantQrUrl } from '@growlog/domain';

describe('plant QR urls', () => {
  it('round-trips growlog scheme links', () => {
    const farmId = '11111111-1111-4111-8111-111111111111';
    const plantId = '22222222-2222-4222-8222-222222222222';
    const url = buildPlantQrUrl({ farmId, plantId });
    expect(parsePlantQrUrl(url)).toEqual({ farmId, plantId });
  });
});
