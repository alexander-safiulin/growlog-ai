import {
  createMobileSupabase,
  getStoredFarmId,
  getStoredScopeId,
  setStoredFarmId,
  setStoredScopeId,
} from '@growlog/api-client';
import {
  endOfTodayIso,
  fetchActiveCycle,
  fetchFarms,
  fetchRecentEvents,
  acceptPendingInvitationsForCurrentUser,
  fetchScopesForCycle,
  localCycleToGrowCycle,
  type AcceptedFarmInvitation,
  localJournalToEventRows,
  LOCAL_WORKSPACE_IDS,
  startOfTodayIso,
  type LocalWorkspaceStore,
} from '@growlog/domain';
import type { EventRow, Farm, GrowCycle, Scope } from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FEED_EVENTS_QUERY_KEY } from '@/components/feed/feedEventsQueryKey';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loadLocalWorkspaceStore,
  saveLocalWorkspaceStore,
} from '@/lib/local-workspace-storage';

type FarmContextValue = {
  supabase: SupabaseClient;
  userId: string | null;
  authLoading: boolean;
  farmListReady: boolean;
  farms: Farm[];
  farmId: string | null;
  setFarmId: (id: string) => void;
  cycle: GrowCycle | null;
  scopes: Scope[];
  scopeId: string | null;
  setScopeId: (id: string) => void;
  primaryScope: Scope | null;
  todayEvents: EventRow[];
  recentEvents: EventRow[];
  loading: boolean;
  refetchAll: () => void;
  isLocalWorkspace: boolean;
  localWorkspace: LocalWorkspaceStore | null;
  updateLocalWorkspace: (updater: (store: LocalWorkspaceStore) => LocalWorkspaceStore) => Promise<void>;
  displayFarmTimezone: string;
  newlyAcceptedInvitations: AcceptedFarmInvitation[];
  dismissAcceptedInvitation: (farmId: string) => void;
};

const FarmContext = createContext<FarmContextValue | null>(null);

function syntheticLocalFarm(store: LocalWorkspaceStore): Farm {
  const now = new Date().toISOString();
  return {
    id: LOCAL_WORKSPACE_IDS.farm,
    name: store.cycle.name,
    slug: null,
    timezone: store.cycle.timezone,
    country: null,
    city: null,
    settings: {},
    is_deleted: false,
    created_at: now,
    updated_at: now,
  };
}

function syntheticLocalScope(store: LocalWorkspaceStore): Scope {
  const now = new Date().toISOString();
  return {
    id: LOCAL_WORKSPACE_IDS.scope,
    farm_id: LOCAL_WORKSPACE_IDS.farm,
    cycle_id: store.cycle.id,
    parent_scope_id: null,
    scope_type: 'zone',
    display_name: 'Main',
    site_id: null,
    zone_id: null,
    plant_id: null,
    plant_group_id: null,
    active: true,
    metadata: { local: true },
    created_at: now,
    updated_at: now,
  };
}

export function FarmProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createMobileSupabase(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [farmId, setFarmIdState] = useState<string | null>(null);
  const [scopeId, setScopeIdState] = useState<string | null>(null);
  const [localWorkspace, setLocalWorkspace] = useState<LocalWorkspaceStore | null>(null);
  const [newlyAcceptedInvitations, setNewlyAcceptedInvitations] = useState<
    AcceptedFarmInvitation[]
  >([]);
  const [dismissedInviteBanners, setDismissedInviteBanners] = useState<Set<string>>(() => new Set());
  const [localReady, setLocalReady] = useState(false);

  useEffect(() => {
    void loadLocalWorkspaceStore().then((store) => {
      setLocalWorkspace(store);
      setLocalReady(true);
    });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const farmsQuery = useQuery({
    queryKey: ['farms', userId],
    enabled: !!userId,
    queryFn: async () => {
      const accepted = await acceptPendingInvitationsForCurrentUser(supabase);
      if (accepted.length) {
        setNewlyAcceptedInvitations((prev) => {
          const ids = new Set(prev.map((p) => p.farm_id));
          const merged = [...prev];
          for (const row of accepted) {
            if (!ids.has(row.farm_id) && !dismissedInviteBanners.has(row.farm_id)) {
              merged.push(row);
              ids.add(row.farm_id);
            }
          }
          return merged;
        });
      }
      return fetchFarms(supabase);
    },
  });

  const dismissAcceptedInvitation = useCallback((id: string) => {
    setDismissedInviteBanners((prev) => new Set(prev).add(id));
    setNewlyAcceptedInvitations((prev) => prev.filter((p) => p.farm_id !== id));
  }, []);

  useEffect(() => {
    if (!farmsQuery.data?.length) return;
    void (async () => {
      const stored = await getStoredFarmId();
      const valid = stored && farmsQuery.data!.some((f) => f.id === stored);
      if (valid && stored) {
        setFarmIdState(stored);
        return;
      }
      setFarmIdState(farmsQuery.data![0].id);
    })();
  }, [farmsQuery.data]);

  const setFarmId = useCallback((id: string) => {
    void setStoredFarmId(id);
    setFarmIdState(id);
  }, []);

  const cycleQuery = useQuery({
    queryKey: ['active-cycle', farmId],
    enabled: !!farmId && !!userId,
    queryFn: () => fetchActiveCycle(supabase, farmId!),
  });

  const scopesQuery = useQuery({
    queryKey: ['scopes', cycleQuery.data?.id],
    enabled: !!cycleQuery.data?.id && !!userId,
    queryFn: () => fetchScopesForCycle(supabase, cycleQuery.data!.id),
  });

  useEffect(() => {
    if (!scopesQuery.data?.length) {
      setScopeIdState(null);
      return;
    }
    void (async () => {
      const stored = await getStoredScopeId();
      const valid = stored && scopesQuery.data!.some((s) => s.id === stored);
      if (valid && stored) {
        setScopeIdState(stored);
        return;
      }
      setScopeIdState(scopesQuery.data![0].id);
    })();
  }, [scopesQuery.data]);

  const setScopeId = useCallback((id: string) => {
    void setStoredScopeId(id);
    setScopeIdState(id);
  }, []);

  const isCloudActive = Boolean(userId && farmId && cycleQuery.data && scopesQuery.data?.length);

  const isLocalWorkspace = localReady && !isCloudActive && localWorkspace != null;

  const cloudPrimaryScope =
    scopesQuery.data?.find((s) => s.id === scopeId) ?? scopesQuery.data?.[0] ?? null;

  const localScope = localWorkspace ? syntheticLocalScope(localWorkspace) : null;

  const cycle = isCloudActive
    ? (cycleQuery.data ?? null)
    : isLocalWorkspace && localWorkspace
      ? localCycleToGrowCycle(localWorkspace.cycle)
      : null;

  const farms = isCloudActive
    ? (farmsQuery.data ?? [])
    : isLocalWorkspace && localWorkspace
      ? [syntheticLocalFarm(localWorkspace)]
      : [];

  const effectiveFarmId = isCloudActive ? farmId : isLocalWorkspace ? LOCAL_WORKSPACE_IDS.farm : null;

  const scopes = isCloudActive ? (scopesQuery.data ?? []) : localScope ? [localScope] : [];

  const primaryScope = isCloudActive ? cloudPrimaryScope : localScope;

  const effectiveScopeId = isCloudActive ? scopeId : localScope?.id ?? null;

  const localEvents = useMemo(
    () => (localWorkspace ? localJournalToEventRows(localWorkspace) : []),
    [localWorkspace],
  );

  const recentQuery = useQuery({
    queryKey: ['events-recent', farmId, cycleQuery.data?.id],
    enabled: isCloudActive,
    queryFn: () =>
      fetchRecentEvents(supabase, {
        farmId: farmId!,
        cycleId: cycleQuery.data!.id,
        limit: 80,
      }),
  });

  const todayQuery = useQuery({
    queryKey: ['events-today', farmId, cycleQuery.data?.id],
    enabled: isCloudActive,
    queryFn: async () => {
      const start = startOfTodayIso();
      const end = endOfTodayIso();
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload, created_at',
        )
        .eq('farm_id', farmId!)
        .eq('cycle_id', cycleQuery.data!.id)
        .gte('occurred_at', start)
        .lte('occurred_at', end)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const todayEvents = isLocalWorkspace
    ? localEvents.filter((e) => {
        const start = startOfTodayIso();
        const end = endOfTodayIso();
        return e.occurred_at >= start && e.occurred_at <= end;
      })
    : (todayQuery.data ?? []);

  const recentEvents = isLocalWorkspace
    ? [...localEvents].reverse().slice(0, 80)
    : (recentQuery.data ?? []);

  const updateLocalWorkspace = useCallback(
    async (updater: (store: LocalWorkspaceStore) => LocalWorkspaceStore) => {
      setLocalWorkspace((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        void saveLocalWorkspaceStore(next);
        return next;
      });
    },
    [],
  );

  const refetchAll = useCallback(() => {
    farmsQuery.refetch();
    cycleQuery.refetch();
    scopesQuery.refetch();
    recentQuery.refetch();
    todayQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ['m-cycle-cal'] });
    void queryClient.invalidateQueries({ queryKey: ['m-cycle-cal-stage'] });
    void queryClient.invalidateQueries({ queryKey: [FEED_EVENTS_QUERY_KEY] });
    void queryClient.invalidateQueries({ queryKey: ['cycle-stage-events'] });
    void queryClient.invalidateQueries({ queryKey: ['cycle-last-feed'] });
    void queryClient.invalidateQueries({ queryKey: ['m-cycle-summary-feed'] });
    void queryClient.invalidateQueries({ queryKey: ['m-harvest'] });
    void loadLocalWorkspaceStore().then(setLocalWorkspace);
  }, [farmsQuery, cycleQuery, scopesQuery, recentQuery, todayQuery, queryClient]);

  const displayFarmTimezone =
    farms.find((f) => f.id === effectiveFarmId)?.timezone ??
    localWorkspace?.cycle.timezone ??
    'UTC';

  const loading =
    !localReady ||
    authLoading ||
    (!!userId && farmsQuery.isLoading) ||
    (isCloudActive && (!!farmId && cycleQuery.isLoading)) ||
    (isCloudActive && !!cycleQuery.data && scopesQuery.isLoading);

  const value: FarmContextValue = {
    supabase,
    userId,
    authLoading,
    farmListReady: !userId || farmsQuery.isFetched,
    farms,
    farmId: effectiveFarmId,
    setFarmId,
    cycle,
    scopes,
    scopeId: effectiveScopeId,
    setScopeId,
    primaryScope,
    todayEvents,
    recentEvents,
    loading,
    refetchAll,
    isLocalWorkspace,
    localWorkspace,
    updateLocalWorkspace,
    displayFarmTimezone,
    newlyAcceptedInvitations,
    dismissAcceptedInvitation,
  };

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarmContext() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarmContext must be used within FarmProvider');
  return ctx;
}
