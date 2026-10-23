import {
  sanitizeAssignment,
  type VpdLeafMode,
  type VpdPersistedSources,
  type VpdSourceAssignment,
} from '@growlog/domain';

const PREFIX = 'growlog:vpd-sources:v2:';
const CHANNEL = 'growlog-vpd-sources';

export type VpdStorageScope = {
  farmId: string;
  cycleId: string | null;
  zoneId: string | null;
};

function scopeKey(scope: VpdStorageScope): string {
  const cycle = scope.cycleId ?? '';
  const zone = scope.zoneId ?? '';
  return `${PREFIX}${scope.farmId}:${cycle}:${zone}`;
}

export function parseVpdLocalPayload(raw: string): VpdPersistedSources | null {
  try {
    const parsed = JSON.parse(raw) as {
      assignment?: unknown;
      leafMode?: VpdLeafMode;
    };
    const assignment = sanitizeAssignment(parsed.assignment);
    if (!assignment) return null;
    const leafMode =
      parsed.leafMode === 'sensor' || parsed.leafMode === 'estimated' || parsed.leafMode === 'none'
        ? parsed.leafMode
        : 'none';
    return { assignment, leafMode };
  } catch {
    return null;
  }
}

export function loadVpdSourceAssignment(scope: VpdStorageScope): VpdPersistedSources | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(scopeKey(scope));
    if (!raw) return null;
    return parseVpdLocalPayload(raw);
  } catch {
    return null;
  }
}

export function saveVpdSourceAssignmentLocal(
  scope: VpdStorageScope,
  sources: VpdPersistedSources
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = scopeKey(scope);
    localStorage.setItem(key, JSON.stringify(sources));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage({ key, sources });
      channel.close();
    }
  } catch {
    /* quota / private mode */
  }
}

export function subscribeVpdSourceAssignment(
  scope: VpdStorageScope,
  onChange: (sources: VpdPersistedSources) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const key = scopeKey(scope);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key || !event.newValue) return;
    const parsed = parseVpdLocalPayload(event.newValue);
    if (parsed) onChange(parsed);
  };
  window.addEventListener('storage', onStorage);
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { key?: string; sources?: VpdPersistedSources };
      if (data?.key === key && data.sources) onChange(data.sources);
    };
  }
  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

/** @deprecated use loadVpdSourceAssignment with scope */
export function loadVpdSourceAssignmentLegacy(farmId: string): VpdSourceAssignment | null {
  const scoped = loadVpdSourceAssignment({ farmId, cycleId: null, zoneId: null });
  return scoped?.assignment ?? null;
}
