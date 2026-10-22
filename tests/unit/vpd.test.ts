import { describe, expect, it } from 'vitest';
import {
  applyClimatePreview,
  canAssignLeaf,
  computeVpdKpa,
  defaultSourceAssignment,
  mergeAssignmentWithDefaults,
  normalizeTuyaNumeric,
  parseClimatePointsFromDevices,
  parseClimatePreviewInput,
  resolveReadingFromAssignment,
  sanitizeAssignment,
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

  it('rejects impossible climate numbers', () => {
    expect(computeVpdKpa({ airTempC: 25, rhPct: 150 })).toBeNull();
    expect(computeVpdKpa({ airTempC: Number.NaN, rhPct: 50 })).toBeNull();
    expect(computeVpdKpa({ airTempC: -237.3, rhPct: 50 })).toBeNull();
    expect(normalizeTuyaNumeric('va_temperature', 2500)).toBe(25);
    expect(normalizeTuyaNumeric('va_humidity', 5500)).toBe(55);
    expect(normalizeTuyaNumeric('va_temperature', '25,5')).toBe(25.5);
    expect(normalizeTuyaNumeric('humidity', -5)).toBeNull();
    expect(normalizeTuyaNumeric('va_temperature', 9000)).toBeNull();
  });

  it('keeps the last reading when a device repeats a code', () => {
    const points = parseClimatePointsFromDevices([
      {
        id: 'd1',
        name: 'Room',
        status: [
          { code: 'va_temperature', value: 200 },
          { code: 'va_temperature', value: 250 },
        ],
      },
    ]);
    expect(points).toHaveLength(1);
    expect(points[0]?.valueCelsius).toBe(25);
  });

  it('drops a stored leaf that is the same point as air', () => {
    const ref = { deviceId: 'a', deviceName: 'Probe', code: 'va_temperature' };
    expect(
      sanitizeAssignment({
        airTemp: ref,
        leafTemp: ref,
        rh: { deviceId: 'h', deviceName: 'RH', code: 'not-humidity' },
      })
    ).toEqual({
      airTemp: ref,
      leafTemp: null,
      rh: null,
    });
  });

  it('ignores an unchanged or impossible preview', () => {
    expect(parseClimatePreviewInput('airTempC', '25,5')).toBe(25.5);
    expect(parseClimatePreviewInput('airTempC', '')).toBe('clear');
    expect(parseClimatePreviewInput('rhPct', '140')).toBe('invalid');
    expect(parseClimatePreviewInput('airTempC', 'abc')).toBe('invalid');
    const live = { airTempC: 25, leafTempC: null, rhPct: 60 };
    expect(applyClimatePreview(null, 'airTempC', 25, live)).toBeNull();
    expect(applyClimatePreview({ rhPct: 40 }, 'rhPct', 'clear', live)).toBeNull();
    expect(applyClimatePreview(null, 'rhPct', 40, live)).toEqual({ rhPct: 40 });
  });

  it('maps stage bands', () => {
    expect(vpdBandForStage('veg')?.label).toBe('0.8–1.2');
    expect(vpdBandForStage('drying')).toBeNull();
    expect(vpdBandStatus(1.0, vpdBandForStage('veg'))).toBe('in_range');
    expect(vpdBandStatus(0.5, vpdBandForStage('veg'))).toBe('below');
    expect(vpdBandStatus(1.5, vpdBandForStage('veg'))).toBe('above');
  });
});
