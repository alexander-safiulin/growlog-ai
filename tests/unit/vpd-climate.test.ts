import { describe, expect, it } from 'vitest';
import {
  buildClimateSourceRows,
  dedupeClimatePointsByDevice,
  effectiveVpdSources,
  formatClimateValueRu,
  formatRelativeTimeRu,
  groupClimatePickerRows,
  hasUserVpdPersistence,
  isClimateSourceStale,
  isInfraredClimateDevice,
  parseClimatePointsFromDevices,
  smartDefaultVpdSources,
  type ClimateSourceRow,
} from '@growlog/domain';

const NOW = Date.parse('2026-10-23T12:00:00.000Z');

function tempPickerRow(input: {
  deviceId: string;
  code: string;
  name: string;
  isInfrared?: boolean;
  valueCelsius?: number;
}): ClimateSourceRow {
  return {
    ref: { deviceId: input.deviceId, deviceName: input.name, code: input.code },
    kind: 'temp',
    deviceId: input.deviceId,
    deviceName: input.name,
    zoneId: 'z1',
    zoneName: 'VEG',
    online: true,
    observedAt: '2026-10-23T11:55:00.000Z',
    valueCelsius: input.valueCelsius ?? 28,
    valueRhPct: null,
    stale: false,
    usable: true,
    isInfrared: input.isInfrared ?? false,
  };
}

describe('vpd-climate picker', () => {
  it('dedupes multiple temperature codes on one device', () => {
    const points = parseClimatePointsFromDevices([
      {
        id: 'd1',
        name: 'Room',
        status: [
          { code: 'temp_current', value: 24 },
          { code: 'va_temperature', value: 25 },
        ],
      },
    ]);
    const deduped = dedupeClimatePointsByDevice(points);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.code).toBe('va_temperature');
    expect(deduped[0]?.valueCelsius).toBe(25);
  });

  it('sorts picker rows online first, then freshest, then name', () => {
    const rows = buildClimateSourceRows({
      tuyaDevices: [
        { id: 'a', name: 'B', online: false, category: null, status: [] },
        { id: 'b', name: 'A', online: true, category: null, status: [] },
      ],
      parsedPoints: parseClimatePointsFromDevices([
        { id: 'a', name: 'B', status: [{ code: 'va_temperature', value: 20 }] },
        { id: 'b', name: 'A', status: [{ code: 'va_temperature', value: 21 }] },
      ]),
      sensorIndex: new Map([
        ['a', { sensorDeviceId: null, zoneId: 'z1', lastSeenAt: '2026-10-23T08:00:00.000Z', isInfrared: false }],
        ['b', { sensorDeviceId: null, zoneId: 'z1', lastSeenAt: '2026-10-23T11:00:00.000Z', isInfrared: false }],
      ]),
      zones: [{ id: 'z1', name: 'Тент' }],
      nowMs: NOW,
    });
    const groups = groupClimatePickerRows({
      rows,
      kind: 'temp',
      cycleZoneId: 'z1',
    });
    expect(groups[0]?.rows[0]?.deviceId).toBe('b');
  });

  it('picks combo device in cycle zone for smart default', () => {
    const rows = buildClimateSourceRows({
      tuyaDevices: [
        { id: 'combo', name: 'Combo', online: true, category: null, status: [] },
        { id: 'other', name: 'Other', online: true, category: null, status: [] },
      ],
      parsedPoints: parseClimatePointsFromDevices([
        {
          id: 'combo',
          name: 'Combo',
          status: [
            { code: 'va_temperature', value: 25 },
            { code: 'va_humidity', value: 55 },
          ],
        },
        {
          id: 'other',
          name: 'Other',
          status: [
            { code: 'va_temperature', value: 26 },
            { code: 'va_humidity', value: 50 },
          ],
        },
      ]),
      sensorIndex: new Map([
        ['combo', { sensorDeviceId: null, zoneId: 'zone-a', lastSeenAt: '2026-10-23T11:55:00.000Z', isInfrared: false }],
        ['other', { sensorDeviceId: null, zoneId: 'zone-b', lastSeenAt: '2026-10-23T11:58:00.000Z', isInfrared: false }],
      ]),
      zones: [
        { id: 'zone-a', name: 'A' },
        { id: 'zone-b', name: 'B' },
      ],
      nowMs: NOW,
    });
    const smart = smartDefaultVpdSources({
      rows,
      cycleZoneId: 'zone-a',
      saved: null,
    });
    expect(smart.autoSelected).toBe(true);
    expect(smart.assignment.airTemp?.deviceId).toBe('combo');
    expect(smart.assignment.rh?.deviceId).toBe('combo');
  });

  it('marks readings older than 3h as stale regardless of online flag', () => {
    expect(
      isClimateSourceStale({
        online: false,
        observedAt: '2026-10-23T07:00:00.000Z',
        nowMs: NOW,
      })
    ).toBe(true);
    expect(
      isClimateSourceStale({
        online: true,
        observedAt: '2026-10-23T07:00:00.000Z',
        nowMs: NOW,
      })
    ).toBe(true);
  });

  it('treats online device with fresh value but no timestamp as not stale', () => {
    expect(
      isClimateSourceStale({
        online: true,
        observedAt: null,
        hasValue: true,
        nowMs: NOW,
      })
    ).toBe(false);
    expect(formatRelativeTimeRu(null, NOW, { online: true })).toBe('сейчас');
  });

  it('lists any temperature sensor as a leaf source except the air point', () => {
    const air = tempPickerRow({
      deviceId: 'air',
      code: 'va_temperature',
      name: '1.3 VEG',
    });
    const sameDeviceOtherCode = tempPickerRow({
      deviceId: 'air',
      code: 'temp_current',
      name: '1.3 VEG',
      valueCelsius: 29.4,
    });
    const clip = tempPickerRow({
      deviceId: 'clip',
      code: 'va_temperature',
      name: 'Leaf clip',
      valueCelsius: 28.1,
    });
    const ir = tempPickerRow({
      deviceId: 'ir',
      code: 'va_temperature',
      name: 'IR probe',
      isInfrared: true,
      valueCelsius: 27.2,
    });
    const humidity: ClimateSourceRow = {
      ...tempPickerRow({ deviceId: 'rh', code: 'va_humidity', name: 'T&h table 3 VEG' }),
      kind: 'rh',
      valueCelsius: null,
      valueRhPct: 60,
    };
    const groups = groupClimatePickerRows({
      rows: [air, sameDeviceOtherCode, clip, ir, humidity],
      kind: 'temp',
      cycleZoneId: 'z1',
      leafOnly: true,
      airAssignment: air.ref,
    });
    const ids = groups.flatMap((g) => g.rows.map((r) => `${r.deviceId}:${r.ref.code}`));
    expect(ids).toEqual(['ir:va_temperature', 'air:temp_current', 'clip:va_temperature']);
  });

  it('detects infrared climate devices from config and naming', () => {
    expect(
      isInfraredClimateDevice({
        category: 'wsdcg',
        config: { is_infrared: true },
      })
    ).toBe(true);
    expect(
      isInfraredClimateDevice({
        category: null,
        name: 'IR leaf probe',
      })
    ).toBe(true);
    expect(
      isInfraredClimateDevice({
        category: 'th',
        deviceType: 'zigbee_temp',
        name: 'Room',
      })
    ).toBe(false);
  });

  it('keeps auto-pick in effective layer only (not user persistence)', () => {
    const rows = buildClimateSourceRows({
      tuyaDevices: [{ id: 'd1', name: 'Tent', online: true, category: null, status: [] }],
      parsedPoints: parseClimatePointsFromDevices([
        {
          id: 'd1',
          name: 'Tent',
          status: [
            { code: 'va_temperature', value: 24 },
            { code: 'va_humidity', value: 55 },
          ],
        },
      ]),
      sensorIndex: new Map([
        [
          'd1',
          {
            sensorDeviceId: null,
            zoneId: 'z1',
            lastSeenAt: '2026-10-23T11:58:00.000Z',
            isInfrared: false,
          },
        ],
      ]),
      zones: [{ id: 'z1', name: 'Тент' }],
      nowMs: NOW,
    });
    const persisted = {
      assignment: { airTemp: null, leafTemp: null, rh: null },
      leafMode: 'none' as const,
    };
    const effective = effectiveVpdSources({
      persisted,
      rows,
      cycleZoneId: 'z1',
    });
    expect(effective.autoSelected).toBe(true);
    expect(effective.assignment.airTemp?.deviceId).toBe('d1');
    expect(hasUserVpdPersistence(persisted)).toBe(false);
  });

  it('formats values for Russian growers', () => {
    expect(formatClimateValueRu('temp', 24.5)).toBe('24,5 °C');
    expect(formatClimateValueRu('rh', 60)).toBe('60 %');
    expect(formatRelativeTimeRu('2026-10-23T11:58:00.000Z', NOW)).toBe('2 мин назад');
  });
});
