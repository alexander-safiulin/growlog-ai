import type { VpdPersistedSources } from '@growlog/domain';

type Listener = () => void;

type StoreEntry = {
  sources: VpdPersistedSources;
  listeners: Set<Listener>;
};

const stores = new Map<string, StoreEntry>();

export function vpdClimateStoreKey(input: {
  farmId: string;
  cycleId: string | null;
  zoneId: string | null;
}): string {
  return `${input.farmId}:${input.cycleId ?? ''}:${input.zoneId ?? ''}`;
}

export function getVpdClimateStore(key: string): VpdPersistedSources | null {
  return stores.get(key)?.sources ?? null;
}

export function setVpdClimateStore(key: string, sources: VpdPersistedSources): void {
  const existing = stores.get(key);
  if (existing) {
    existing.sources = sources;
    for (const listener of existing.listeners) listener();
    return;
  }
  stores.set(key, { sources, listeners: new Set() });
}

export function subscribeVpdClimateStore(key: string, listener: Listener): () => void {
  let entry = stores.get(key);
  if (!entry) {
    entry = {
      sources: { assignment: { airTemp: null, leafTemp: null, rh: null }, leafMode: 'none' },
      listeners: new Set(),
    };
    stores.set(key, entry);
  }
  entry.listeners.add(listener);
  return () => entry?.listeners.delete(listener);
}
