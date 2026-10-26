import { describe, expect, it } from 'vitest';
import {
  filterTuyaDevicesForFarm,
  hasFarmTuyaBindings,
  type FarmTuyaBindings,
} from '@/lib/tuya/farm-bindings';
import type { TuyaDeviceRecord } from '@/lib/tuya/client';

function device(id: string, ownerUid: string | null): TuyaDeviceRecord {
  return {
    id,
    name: id,
    productName: null,
    category: null,
    online: true,
    sub: false,
    status: [],
    ownerUid,
  };
}

describe('filterTuyaDevicesForFarm', () => {
  const bindings: FarmTuyaBindings = {
    linkedUids: new Set(['uid-a']),
    linkedDeviceIds: new Set(['explicit-dev']),
  };

  it('returns empty when farm has no bindings', () => {
    const empty: FarmTuyaBindings = { linkedUids: new Set(), linkedDeviceIds: new Set() };
    expect(hasFarmTuyaBindings(empty)).toBe(false);
    expect(filterTuyaDevicesForFarm([device('d1', 'uid-a')], empty)).toEqual([]);
  });

  it('keeps devices by owner uid or explicit device id when owner uid matches', () => {
    const filtered = filterTuyaDevicesForFarm(
      [
        device('d1', 'uid-a'),
        device('d2', 'uid-b'),
        device('explicit-dev', 'uid-a'),
        device('orphan-explicit', null),
      ],
      bindings
    );
    expect(filtered.map((d) => d.id).sort()).toEqual(['d1', 'explicit-dev']);
    expect(JSON.stringify(filtered)).not.toContain('ownerUid');
    expect(JSON.stringify(filtered)).not.toContain('uid-a');
  });
});
