import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseManualClimate, type ManualClimateReading } from '@growlog/domain';

const PREFIX = 'growlog:vpd-manual:v1:';

export type ManualClimateSnapshot = {
  reading: ManualClimateReading | null;
  loaded: boolean;
};

const EMPTY_SNAPSHOT: ManualClimateSnapshot = { reading: null, loaded: false };

type Listener = () => void;

type Entry = {
  snapshot: ManualClimateSnapshot;
  listeners: Set<Listener>;
  epoch: number;
};

const entries = new Map<string, Entry>();

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

function entryFor(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { snapshot: EMPTY_SNAPSHOT, listeners: new Set(), epoch: 0 };
    entries.set(key, entry);
  }
  return entry;
}

function publish(key: string, snapshot: ManualClimateSnapshot) {
  const entry = entryFor(key);
  entry.snapshot = snapshot;
  for (const listener of entry.listeners) listener();
}

export function getEmptyManualClimateSnapshot(): ManualClimateSnapshot {
  return EMPTY_SNAPSHOT;
}

export function getManualClimateSnapshot(key: string): ManualClimateSnapshot {
  return entryFor(key).snapshot;
}

export function subscribeManualClimate(key: string, listener: Listener): () => void {
  const entry = entryFor(key);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

export function ensureManualClimateLoaded(key: string): void {
  const entry = entryFor(key);
  if (entry.snapshot.loaded) return;
  const epoch = entry.epoch;
  void AsyncStorage.getItem(storageKey(key))
    .then((raw) => {
      if (entryFor(key).epoch !== epoch) return;
      const reading = raw ? parseManualClimate(JSON.parse(raw) as unknown) : null;
      publish(key, { reading, loaded: true });
    })
    .catch(() => {
      if (entryFor(key).epoch !== epoch) return;
      publish(key, { reading: null, loaded: true });
    });
}

export async function writeManualClimate(key: string, reading: ManualClimateReading): Promise<void> {
  const entry = entryFor(key);
  entry.epoch += 1;
  publish(key, { reading, loaded: true });
  try {
    await AsyncStorage.setItem(storageKey(key), JSON.stringify(reading));
  } catch {
    /* storage full */
  }
}
