import { File } from 'expo-file-system';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Read a local file URI as base64 (works with expo-audio recording URIs). */
export async function uriToBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    if (file.exists) {
      const encoded = await file.base64();
      if (encoded) return encoded;
    }
  } catch {
    // fall through to fetch
  }

  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1) throw new Error('invalid_audio');
  return bytesToBase64(new Uint8Array(buf));
}
