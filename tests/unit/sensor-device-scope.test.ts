import { describe, expect, it } from 'vitest';
import {
  resolveDeviceScopeId,
  resolveDeviceZoneId,
} from '@/lib/growlog/sensor-device-scope';

describe('sensor-device-scope', () => {
  it('reads scope_id from config', () => {
    expect(resolveDeviceScopeId({ scope_id: 'abc' })).toBe('abc');
    expect(resolveDeviceScopeId({ scopeId: 'def' })).toBe('def');
  });

  it('reads zone_id from config', () => {
    expect(resolveDeviceZoneId({ zone_id: 'z1' })).toBe('z1');
  });

  it('returns null when unbound', () => {
    expect(resolveDeviceScopeId(null)).toBeNull();
    expect(resolveDeviceZoneId({})).toBeNull();
  });
});
