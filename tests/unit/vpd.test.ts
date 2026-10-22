import { describe, expect, it } from 'vitest';
import {
  canAssignLeaf,
  computeVpdKpa,
  defaultSourceAssignment,
  mergeAssignmentWithDefaults,
  normalizeTuyaNumeric,
  parseClimatePointsFromDevices,
  resolveReadingFromAssignment,
  saturationVaporPressureKpa,
  vpdBandForStage,
  vpdBandStatus,
} from '@growlog/domain';

describe('vpd', () => {
  it('computes saturation vapor pressure (Magnus)', () => {
    expect(saturationVaporPressureKpa(25)).toBeCloseTo(3.17, 2);
  });

  it('computes air VPD at 25 °C and 60% RH', () => {
    const vpd = computeVpdKpa({ airTempC: 25, rhPct: 60 });
    expect(vpd).toBeCloseTo(1.27, 2);
  });

  it('computes leaf VPD when leaf sensor is assigned', () => {
    const vpd = computeVpdKpa({ airTempC: 25, rhPct: 60, leafTempC: 23 });
    expect(vpd).toBeCloseTo(0.91, 2);
  });

  it('scales Tuya integer temperature and humidity', () => {
    expect(normalizeTuyaNumeric('va_temperature', 250)).toBe(25);
    expect(normalizeTuyaNumeric('humidity_value', 550)).toBe(55);
    expect(normalizeTuyaNumeric('va_temperature', 22.5)).toBe(22.5);
  });

  it('ignores unknown status codes', () => {
    const devices = [
      {
        id: 'd1',
        name: 'Room',
        status: [
          { code: 'switch', value: true },
          { code: 'va_temperature', value: 240 },
          { code: 'va_humidity', value: 580 },
        ],
      },
    ];
    const points = parseClimatePointsFromDevices(devices);
    expect(points).toHaveLength(2);
    expect(points.find((p) => p.kind === 'temp')?.valueCelsius).toBe(24);
    expect(points.find((p) => p.kind === 'rh')?.valueRhPct).toBe(58);
  });

  it('keeps a saved leaf assignment when filling defaults', () => {
    const points = parseClimatePointsFromDevices([
      {
        id: 'a',
        name: 'Air',
        status: [
          { code: 'va_temperature', value: 25 },
          { code: 'va_humidity', value: 50 },
        ],
      },
    ]);
    const merged = mergeAssignmentWithDefaults(
      {
        airTemp: null,
        leafTemp: { deviceId: 'clip', deviceName: 'Clip', code: 'va_temperature' },
        rh: null,
      },
      points
    );
    expect(merged.airTemp?.deviceId).toBe('a');
    expect(merged.rh?.deviceId).toBe('a');
    expect(merged.leafTemp?.deviceId).toBe('clip');
  });

  it('defaults single temp and rh as air and humidity sources', () => {
    const points = parseClimatePointsFromDevices([
      {
        id: 'd1',
        name: 'Combo',
        status: [
          { code: 'temp_current', value: 26 },
          { code: 'humidity', value: 50 },
        ],
      },
    ]);
    const assignment = defaultSourceAssignment(points);
    expect(assignment.airTemp?.code).toBe('temp_current');
    expect(assignment.rh?.code).toBe('humidity');
    expect(assignment.leafTemp).toBeNull();
  });

  it('resolves live values from assignment', () => {
    const points = parseClimatePointsFromDevices([
      {
        id: 'a',
        name: 'Air probe',
        status: [{ code: 'va_temperature', value: 25 }],
      },
      {
        id: 'l',
        name: 'Leaf clip',
        status: [{ code: 'va_temperature', value: 230 }],
      },
      {
        id: 'h',
        name: 'RH',
        status: [{ code: 'va_humidity', value: 600 }],
      },
    ]);
    const assignment = {
      airTemp: { deviceId: 'a', deviceName: 'Air probe', code: 'va_temperature' },
      leafTemp: { deviceId: 'l', deviceName: 'Leaf clip', code: 'va_temperature' },
      rh: { deviceId: 'h', deviceName: 'RH', code: 'va_humidity' },
    };
    const live = resolveReadingFromAssignment(assignment, points);
    expect(live.airTempC).toBe(25);
    expect(live.leafTempC).toBe(23);
    expect(live.rhPct).toBe(60);
  });

  it('blocks leaf assignment on same point as air', () => {
    const ref = { deviceId: 'a', deviceName: 'X', code: 'va_temperature' };
    expect(
      canAssignLeaf(ref, {
        airTemp: ref,
        leafTemp: null,
        rh: null,
      })
    ).toBe(false);
  });

  it('maps stage bands', () => {
    expect(vpdBandForStage('veg')?.label).toBe('0.8–1.2');
    expect(vpdBandForStage('drying')).toBeNull();
    expect(vpdBandStatus(1.0, vpdBandForStage('veg'))).toBe('in_range');
    expect(vpdBandStatus(0.5, vpdBandForStage('veg'))).toBe('below');
    expect(vpdBandStatus(1.5, vpdBandForStage('veg'))).toBe('above');
  });
});
