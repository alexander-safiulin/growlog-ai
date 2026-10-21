// Hermes has no Web Crypto global. Reading `crypto` throws
// ReferenceError: Property 'crypto' doesn't exist. Supabase auth and the
// mobile UUID callers depend on that global.

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

type DigestAlgorithm = string | { name?: string };

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  const length = ((data.length + 9 + 63) >> 6) << 6;
  const bytes = new Uint8Array(length);
  bytes.set(data);
  bytes[data.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bitLength = data.length * 8;
  view.setUint32(length - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(length - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      schedule[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const w15 = schedule[index - 15] ?? 0;
      const w2 = schedule[index - 2] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      schedule[index] =
        (((schedule[index - 16] ?? 0) + s0 + (schedule[index - 7] ?? 0) + s1) >>> 0);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (SHA256_K[index] ?? 0) + (schedule[index] ?? 0)) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function toUint8Array(data: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

// Hermes exposes no CSPRNG in JavaScript. Callers use these bytes for ids
// and Supabase PKCE material, not as a hardware random source.
function fillRandomBytes(bytes: Uint8Array): void {
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
}

function randomUUID(): string {
  const bytes = new Uint8Array(16);
  fillRandomBytes(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createWebCryptoPolyfill(): {
  getRandomValues: <T extends ArrayBufferView>(typedArray: T) => T;
  randomUUID: () => string;
  subtle: {
    digest: (algorithm: DigestAlgorithm, data: ArrayBuffer | ArrayBufferView) => Promise<ArrayBuffer>;
  };
} {
  return {
    getRandomValues<T extends ArrayBufferView>(typedArray: T): T {
      const bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
      fillRandomBytes(bytes);
      return typedArray;
    },
    randomUUID,
    subtle: {
      async digest(algorithm: DigestAlgorithm, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> {
        const name = (typeof algorithm === 'string' ? algorithm : (algorithm.name ?? '')).toUpperCase();
        if (name !== 'SHA-256') {
          throw new Error(`Unsupported digest ${name}`);
        }
        const hash = sha256Bytes(toUint8Array(data));
        const copy = new ArrayBuffer(hash.byteLength);
        new Uint8Array(copy).set(hash);
        return copy;
      },
    },
  };
}

function hasUsableCrypto(): boolean {
  try {
    const current = (globalThis as { crypto?: { getRandomValues?: unknown; randomUUID?: unknown; subtle?: { digest?: unknown } } }).crypto;
    return (
      typeof current?.getRandomValues === 'function' &&
      typeof current?.randomUUID === 'function' &&
      typeof current?.subtle?.digest === 'function'
    );
  } catch {
    return false;
  }
}

export function installWebCryptoPolyfill(): void {
  if (hasUsableCrypto()) return;
  Object.defineProperty(globalThis, 'crypto', {
    value: createWebCryptoPolyfill(),
    configurable: true,
    writable: true,
  });
}

installWebCryptoPolyfill();
