import { createHash, createHmac } from 'node:crypto';

const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const DEFAULT_API_BASE = 'https://openapi.tuyaus.com';
const MAX_PAGES = 20;

export type TuyaStatusPoint = {
  code: string;
  value: string | number | boolean;
};

export type TuyaDeviceView = {
  id: string;
  name: string;
  productName: string | null;
  category: string | null;
  online: boolean;
  sub: boolean;
  status: TuyaStatusPoint[];
};

/** Internal list shape: includes Smart Life account uid for farm binding (not exposed to clients). */
export type TuyaDeviceRecord = TuyaDeviceView & {
  ownerUid: string | null;
};

type RawDevice = {
  id?: unknown;
  name?: unknown;
  product_name?: unknown;
  category?: unknown;
  online?: unknown;
  sub?: unknown;
  status?: unknown;
};

type TuyaEnvelope = {
  success?: boolean;
  code?: number | string;
  msg?: string;
  result?: unknown;
};

export class TuyaConfigError extends Error {
  constructor() {
    super('tuya_unconfigured');
    this.name = 'TuyaConfigError';
  }
}

export class TuyaApiError extends Error {
  constructor(
    message: string,
    readonly tuyaCode: number | string | null
  ) {
    super(message);
    this.name = 'TuyaApiError';
  }
}

export function canonicalQuery(query: Record<string, string | number | undefined>): string {
  return Object.entries(query)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/** Cloud-auth HMAC. Nonce is omitted; Tuya treats a missing nonce as empty. */
export function signTuyaRequest(input: {
  accessKey: string;
  secretKey: string;
  method: string;
  path: string;
  timestamp: string;
  accessToken?: string;
  body?: string;
}): string {
  const bodyHash = input.body
    ? createHash('sha256').update(input.body).digest('hex')
    : EMPTY_BODY_SHA256;
  const stringToSign = [input.method.toUpperCase(), bodyHash, '', input.path].join('\n');
  const payload = `${input.accessKey}${input.accessToken ?? ''}${input.timestamp}${stringToSign}`;
  return createHmac('sha256', input.secretKey).update(payload).digest('hex').toUpperCase();
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Public list shape. Drops local_key, IP, and owner ids. */
export function toPublicTuyaDevice(raw: RawDevice): TuyaDeviceView | null {
  const record = toTuyaDeviceRecord(raw);
  if (!record) return null;
  return toPublicDeviceView(record);
}

export function toPublicDeviceView(record: TuyaDeviceRecord): TuyaDeviceView {
  return {
    id: record.id,
    name: record.name,
    productName: record.productName,
    category: record.category,
    online: record.online,
    sub: record.sub,
    status: record.status,
  };
}

export function toTuyaDeviceRecord(raw: RawDevice): TuyaDeviceRecord | null {
  const id = asString(raw.id);
  if (!id) return null;
  const status: TuyaStatusPoint[] = [];
  if (Array.isArray(raw.status)) {
    for (const point of raw.status) {
      if (!point || typeof point !== 'object') continue;
      const code = asString((point as { code?: unknown }).code);
      const value = (point as { value?: unknown }).value;
      if (!code) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        status.push({ code, value });
      }
    }
  }
  const uidRaw = (raw as { uid?: unknown }).uid;
  return {
    id,
    name: asString(raw.name) ?? id,
    productName: asString(raw.product_name),
    category: asString(raw.category),
    online: raw.online === true,
    sub: raw.sub === true,
    status,
    ownerUid: asString(uidRaw),
  };
}

function tuyaConfig(): { accessKey: string; secretKey: string; baseUrl: string } {
  const accessKey = process.env.TUYA_ACCESS_ID?.trim() ?? '';
  const secretKey = process.env.TUYA_ACCESS_SECRET?.trim() ?? '';
  if (!accessKey || !secretKey) throw new TuyaConfigError();
  const baseUrl = (process.env.TUYA_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/$/, '');
  return { accessKey, secretKey, baseUrl };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function tuyaGet<T>(
  path: string,
  query: Record<string, string | number | undefined>,
  accessToken?: string
): Promise<T> {
  const { accessKey, secretKey, baseUrl } = tuyaConfig();
  const qs = canonicalQuery(query);
  const urlPath = qs ? `${path}?${qs}` : path;
  const timestamp = Date.now().toString();
  const sign = signTuyaRequest({
    accessKey,
    secretKey,
    method: 'GET',
    path: urlPath,
    timestamp,
    accessToken,
  });
  const headers: Record<string, string> = {
    client_id: accessKey,
    sign,
    t: timestamp,
    sign_method: 'HMAC-SHA256',
  };
  if (accessToken) headers.access_token = accessToken;

  const response = await fetch(`${baseUrl}${urlPath}`, { method: 'GET', headers });
  const text = await response.text();
  let body: TuyaEnvelope;
  try {
    body = JSON.parse(text) as TuyaEnvelope;
  } catch {
    throw new TuyaApiError('tuya_bad_response', response.status);
  }
  if (!body.success) {
    const message = typeof body.msg === 'string' && body.msg.trim() ? body.msg.trim() : 'tuya_request_failed';
    throw new TuyaApiError(message.slice(0, 200), body.code ?? null);
  }
  return body.result as T;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const result = await tuyaGet<{ access_token?: string; expire_time?: number }>(
    '/v1.0/token',
    { grant_type: 1 }
  );
  const token = asString(result?.access_token);
  if (!token) throw new TuyaApiError('tuya_token_missing', null);
  const ttlSeconds = typeof result.expire_time === 'number' ? result.expire_time : 3600;
  cachedToken = { value: token, expiresAt: Date.now() + Math.max(60, ttlSeconds - 120) * 1000 };
  return token;
}

function isPermissionDenied(code: number | string | null): boolean {
  return code === 1106 || code === '1106' || code === 28841002 || code === '28841002';
}

async function listAssociated(token: string): Promise<TuyaDeviceRecord[]> {
  const devices: TuyaDeviceRecord[] = [];
  let lastRowKey = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await tuyaGet<{
      devices?: RawDevice[];
      has_more?: boolean;
      last_row_key?: string;
    }>('/v1.0/iot-01/associated-users/devices', { size: 50, last_row_key: lastRowKey || undefined }, token);
    for (const raw of result?.devices ?? []) {
      const view = toTuyaDeviceRecord(raw);
      if (view) devices.push(view);
    }
    if (!result?.has_more || !result.last_row_key) break;
    lastRowKey = result.last_row_key;
  }
  return devices;
}

async function listProjectDevices(token: string): Promise<TuyaDeviceRecord[]> {
  const devices: TuyaDeviceRecord[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await tuyaGet<{ devices?: RawDevice[]; total?: number }>(
      '/v1.0/devices',
      { page_no: page, page_size: 50 },
      token
    );
    const batch = result?.devices ?? [];
    for (const raw of batch) {
      const view = toTuyaDeviceRecord(raw);
      if (view) devices.push(view);
    }
    if (batch.length < 50) break;
    if (typeof result?.total === 'number' && devices.length >= result.total) break;
  }
  return devices;
}

/** Devices linked to the cloud project (SmartLife account). Not written to the farm database. */
export async function listTuyaProjectDeviceRecords(): Promise<TuyaDeviceRecord[]> {
  const token = await getAccessToken();
  try {
    return await listAssociated(token);
  } catch (error) {
    if (!(error instanceof TuyaApiError) || !isPermissionDenied(error.tuyaCode)) throw error;
    return listProjectDevices(token);
  }
}

/** @deprecated prefer listTuyaProjectDeviceRecords + farm binding filter */
export async function listTuyaProjectDevices(): Promise<TuyaDeviceView[]> {
  const records = await listTuyaProjectDeviceRecords();
  return records.map(toPublicDeviceView);
}
