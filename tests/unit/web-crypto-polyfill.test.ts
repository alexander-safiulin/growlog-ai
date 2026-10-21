import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createWebCryptoPolyfill, sha256Bytes } from '../../apps/mobile/lib/install-web-crypto';

describe('web crypto polyfill', () => {
  it('matches SHA-256 for empty, text, and binary input', () => {
    const samples = [
      new Uint8Array(),
      new TextEncoder().encode('abc'),
      Uint8Array.from({ length: 100 }, (_, index) => index),
    ];
    for (const sample of samples) {
      const expected = createHash('sha256').update(sample).digest();
      expect(Buffer.from(sha256Bytes(sample))).toEqual(expected);
    }
  });

  it('exposes randomUUID, getRandomValues, and SHA-256 digest', async () => {
    const crypto = createWebCryptoPolyfill();
    expect(crypto.randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );

    const words = new Uint32Array(4);
    crypto.getRandomValues(words);
    expect(words.some((word) => word !== 0)).toBe(true);

    const payload = new TextEncoder().encode('pkce-verifier');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', payload));
    expect(Buffer.from(digest)).toEqual(createHash('sha256').update(payload).digest());
  });
});
