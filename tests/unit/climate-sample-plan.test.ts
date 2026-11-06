import { describe, expect, it } from 'vitest';
import {
  climateSamplesFromAssignment,
  resolveClimateSampleScope,
  unloadedPlaceScopes,
} from '@/lib/growlog/climate-sample-plan';

const devices = [
  {
    id: 'air',
    name: 'Room probe',
    status: [
      { code: 'va_temperature', value: 250 },
      { code: 'va_humidity', value: 620 },
    ],
  },
];

describe('climateSamplesFromAssignment', () => {
  it('maps assigned air and humidity into metric codes', () => {
    const samples = climateSamplesFromAssignment(
      {
        airTemp: { deviceId: 'air', deviceName: 'Room probe', code: 'va_temperature' },
        leafTemp: null,
        rh: { deviceId: 'air', deviceName: 'Room probe', code: 'va_humidity' },
      },
      devices
    );
    expect(samples).toEqual([
      {
        metricCode: 'temp_air',
        unit: '°C',
        value: 25,
        deviceId: 'air',
        statusCode: 'va_temperature',
      },
      {
        metricCode: 'rh',
        unit: '%',
        value: 62,
        deviceId: 'air',
        statusCode: 'va_humidity',
      },
    ]);
  });
});

describe('resolveClimateSampleScope', () => {
  it('uses the only room', () => {
    expect(
      resolveClimateSampleScope(
        [
          { id: 'tent', zoneId: null, scopeType: 'tent', active: true },
          { id: 'plant', zoneId: null, scopeType: 'plant', active: true },
        ],
        null
      )
    ).toEqual({ scopeId: 'tent' });
  });

  it('refuses to guess when two rooms are active', () => {
    expect(
      resolveClimateSampleScope(
        [
          { id: 'a', zoneId: 'z1', scopeType: 'room', active: true },
          { id: 'b', zoneId: 'z2', scopeType: 'room', active: true },
        ],
        null
      )
    ).toEqual({ skip: 'ambiguous_room' });
  });

  it('picks the room in the assigned zone', () => {
    expect(
      resolveClimateSampleScope(
        [
          { id: 'a', zoneId: 'z1', scopeType: 'room', active: true },
          { id: 'b', zoneId: 'z2', scopeType: 'room', active: true },
        ],
        'z2'
      )
    ).toEqual({ scopeId: 'b' });
  });
});

describe('unloadedPlaceScopes', () => {
  it('lists other rooms and skips the selected one', () => {
    const names = new Map([
      ['a', 'Veg'],
      ['b', 'Flower'],
    ]);
    expect(
      unloadedPlaceScopes(
        [
          { id: 'a', zoneId: null, scopeType: 'room', active: true },
          { id: 'b', zoneId: null, scopeType: 'tent', active: true },
          { id: 'p', zoneId: null, scopeType: 'plant', active: true },
        ],
        'a',
        names
      )
    ).toEqual([{ id: 'b', displayName: 'Flower' }]);
  });
});
