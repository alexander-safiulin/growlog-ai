import { describe, expect, it } from 'vitest';
import { restrictVpdSourcesToDeviceIds } from '@growlog/domain';

describe('restrictVpdSourcesToDeviceIds', () => {
  it('drops assignment refs for devices not linked to the farm', () => {
    const allowed = new Set(['dev-1']);
    const result = restrictVpdSourcesToDeviceIds(
      {
        assignment: {
          airTemp: { deviceId: 'dev-1', deviceName: 'A', code: 'temp' },
          leafTemp: { deviceId: 'dev-2', deviceName: 'B', code: 'temp' },
          rh: { deviceId: 'dev-3', deviceName: 'C', code: 'humidity' },
        },
        leafMode: 'sensor',
      },
      allowed
    );
    expect(result.assignment.airTemp?.deviceId).toBe('dev-1');
    expect(result.assignment.leafTemp).toBeNull();
    expect(result.assignment.rh).toBeNull();
    expect(result.leafMode).toBe('none');
  });
});
