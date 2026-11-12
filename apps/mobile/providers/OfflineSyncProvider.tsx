import { flushOfflineQueue, type FlushOfflineQueueResult } from '@/lib/offline-sync';
import { getOfflineQueue, subscribeOfflineQueue } from '@/lib/offline-queue';
import { setTimelineOpenIntent } from '@/lib/timeline-open-intent';
import { useFarmContext } from '@/providers/FarmProvider';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

export type PendingLeafSync = {
  eventId: string;
  mediaAssetId: string;
};

type OfflineSyncContextValue = {
  queueCount: number;
  syncing: boolean;
  lastSyncResult: FlushOfflineQueueResult | null;
  pendingLeafSync: PendingLeafSync | null;
  refreshQueueCount: () => Promise<void>;
  syncNow: () => Promise<void>;
  openPendingLeafSync: () => Promise<void>;
  dismissPendingLeafSync: () => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

function pickLatestLeafSync(result: FlushOfflineQueueResult): PendingLeafSync | null {
  const leaf = result.syncedPhotos.filter((p) => p.leafCapture);
  if (!leaf.length) return null;
  const latest = leaf[leaf.length - 1]!;
  return { eventId: latest.eventId, mediaAssetId: latest.mediaAssetId };
}

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { supabase, userId, refetchAll } = useFarmContext();
  const router = useRouter();
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<FlushOfflineQueueResult | null>(null);
  const [pendingLeafSync, setPendingLeafSync] = useState<PendingLeafSync | null>(null);

  const refreshQueueCount = useCallback(async () => {
    const q = await getOfflineQueue();
    setQueueCount(q.filter((i) => i.status === 'pending' || i.status === 'failed').length);
  }, []);

  const applySyncResult = useCallback((result: FlushOfflineQueueResult) => {
    setLastSyncResult(result);
    const nextLeaf = pickLatestLeafSync(result);
    if (nextLeaf) setPendingLeafSync(nextLeaf);
  }, []);

  const syncNow = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const result = await flushOfflineQueue(supabase);
      applySyncResult(result);
      if (result.synced > 0) await refetchAll();
      await refreshQueueCount();
    } finally {
      setSyncing(false);
    }
  }, [supabase, userId, refetchAll, refreshQueueCount, applySyncResult]);

  const openPendingLeafSync = useCallback(async () => {
    if (!pendingLeafSync) return;
    setTimelineOpenIntent({
      eventId: pendingLeafSync.eventId,
      mediaAssetId: pendingLeafSync.mediaAssetId,
      pollLeaf: true,
    });
    setPendingLeafSync(null);
    await refetchAll();
    router.push('/(tabs)/timeline');
  }, [pendingLeafSync, refetchAll, router]);

  const dismissPendingLeafSync = useCallback(() => {
    setPendingLeafSync(null);
  }, []);

  useEffect(() => {
    void refreshQueueCount();
    return subscribeOfflineQueue(() => {
      void refreshQueueCount();
    });
  }, [refreshQueueCount]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshQueueCount();
    });
    return () => sub.remove();
  }, [refreshQueueCount]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void syncNow();
      }
    });
    return unsub;
  }, [syncNow]);

  return (
    <OfflineSyncContext.Provider
      value={{
        queueCount,
        syncing,
        lastSyncResult,
        pendingLeafSync,
        refreshQueueCount,
        syncNow,
        openPendingLeafSync,
        dismissPendingLeafSync,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  return ctx;
}
