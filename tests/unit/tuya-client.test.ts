import { describe, expect, it } from 'vitest';
import { canonicalQuery, signTuyaRequest, toPublicTuyaDevice } from '@/lib/tuya/client';

describe('tuya client', () => {
  it('sorts query keys before signing', () => {
    expect(canonicalQuery({ size: 50, last_row_key: 'abc', empty: '' })).toBe(
      'last_row_key=abc&size=50'
    );
  });

  it('signs the cloud request without a nonce', () => {
    const sign = signTuyaRequest({
      accessKey: 'test-access',
      secretKey: 'test-secret',
      method: 'GET',
      path: '/v1.0/token?grant_type=1',
      timestamp: '1588925778000',
    });
    expect(sign).toBe('22FF6D4A1B749AADE99A59FAC6DA57D47C4D9CFC40CC43B68C4AA506B40B8A92');
    expect(sign).toBe(
      signTuyaRequest({
        accessKey: 'test-access',
        secretKey: 'test-secret',
        method: 'get',
        path: '/v1.0/token?grant_type=1',
        timestamp: '1588925778000',
        accessToken: '',
      })
    );
  });

  it('drops device secrets from the public list', () => {
    const raw = {
      id: 'eb555c445beb2ce896a2qk',
      name: 'Veg',
      product_name: 'Smart plug',
      category: 'cz',
      online: true,
      sub: false,
      local_key: 'secret-local-key',
      ip: '10.0.0.8',
      uid: 'user-uid',
      status: [
        { code: 'switch_1', value: true },
        { code: 'cur_power', value: 12 },
        { code: 'nested', value: { watts: 1 } },
      ],
    };
    const view = toPublicTuyaDevice(raw);
    expect(view).toEqual({
      id: 'eb555c445beb2ce896a2qk',
      name: 'Veg',
      productName: 'Smart plug',
      category: 'cz',
      online: true,
      sub: false,
      status: [
        { code: 'switch_1', value: true },
        { code: 'cur_power', value: 12 },
      ],
    });
    expect(JSON.stringify(view)).not.toContain('secret-local-key');
    expect(JSON.stringify(view)).not.toContain('10.0.0.8');
  });
});
