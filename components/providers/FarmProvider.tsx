'use client';

import { createClient } from '@/lib/supabase/client';
import {
  acceptFarmInvitation,
  listPendingFarmInvitationsForCurrentUser,
  type AcceptedFarmInvitation,
  type PendingFarmInvitation,
} from '@growlog/domain';
import {
  fetchActiveCycle,
  fetchFarms,
  fetchRecentEvents,
  fetchScopesForCycle,
  startOfTodayIso,
  endOfTodayIso,
} from '@/lib/growlog/queries';
import {
  dismissFarmInvitationBanner,
  isFarmInvitationBannerDismissed,
} from '@/lib/growlog/farm-invitation-banner';
import type { EventRow, Farm, GrowCycle, Scope } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const FARM_STORAGE_KEY = 'growlog_active_farm_id';
const SCOPE_STORAGE_KEY = 'growlog_active_scope_id';
const DISMISSED_PENDING_INVITES_KEY = 'growlog_dismissed_pending_invite_ids';

type FarmContextValue = {
  supabase: ReturnType<typeof createClient>;
  userId: string | null;
  authLoading: boolean;
  /** Farms list fetch finished (or skipped if logged out). */
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
  newlyAcceptedInvitations: AcceptedFarmInvitation[];
  dismissAcceptedInvitation: (farmId: string) => void;
  pendingFarmInvitations: PendingFarmInvitation[];
  dismissPendingInvitation: (invitationId: string) => void;
  acceptFarmInvitationById: (invitationId: string) => Promise<void>;
};

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [farmId, setFarmIdState] = useState<string | null>(null);
  const [scopeId, setScopeIdState] = useState<string | null>(null);
  const [newlyAcceptedInvitations, setNewlyAcceptedInvitations] = useState<
    AcceptedFarmInvitation[]
  >([]);
  const [dismissedPendingInviteIds, setDismissedPendingInviteIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(DISMISSED_PENDING_INVITES_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    } catch {
      return new Set();
    }
  });

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
    queryFn: () => fetchFarms(supabase),
  });

  const pendingInvitesQuery = useQuery({
    queryKey: ['pending-farm-invitations', userId],
    enabled: !!userId,
    queryFn: () => listPendingFarmInvitationsForCurrentUser(supabase),
  });

  const pendingFarmInvitations = useMemo(() => {
    const rows = pendingInvitesQuery.data ?? [];
    return rows.filter((row) => !dismissedPendingInviteIds.has(row.id));
  }, [pendingInvitesQuery.data, dismissedPendingInviteIds]);

  const dismissPendingInvitation = useCallback((invitationId: string) => {
    setDismissedPendingInviteIds((prev) => {
      const next = new Set(prev);
      next.add(invitationId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(DISMISSED_PENDING_INVITES_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  }, []);

  const acceptFarmInvitationById = useCallback(
    async (invitationId: string) => {
      const accepted = await acceptFarmInvitation(supabase, invitationId);
      if (accepted && !isFarmInvitationBannerDismissed(accepted.farm_id)) {
        setNewlyAcceptedInvitations((prev) => {
          if (prev.some((p) => p.farm_id === accepted.farm_id)) return prev;
          return [...prev, accepted];
        });
      }
      dismissPendingInvitation(invitationId);
      await Promise.all([farmsQuery.refetch(), pendingInvitesQuery.refetch()]);
    },
    [supabase, dismissPendingInvitation, farmsQuery, pendingInvitesQuery],
  );

  const dismissAcceptedInvitation = useCallback((id: string) => {
    dismissFarmInvitationBanner(id);
    setNewlyAcceptedInvitations((prev) => prev.filter((p) => p.farm_id !== id));
  }, []);

  useEffect(() => {
    if (!farmsQuery.data?.length) return;
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem(FARM_STORAGE_KEY) : null;
    const valid = stored && farmsQuery.data.some((f) => f.id === stored);
    if (valid) {
      setFarmIdState(stored);
      return;
    }
    setFarmIdState(farmsQuery.data[0].id);
  }, [farmsQuery.data]);

  const setFarmId = useCallback((id: string) => {
    localStorage.setItem(FARM_STORAGE_KEY, id);
    setFarmIdState(id);
  }, []);

  const cycleQuery = useQuery({
    queryKey: ['active-cycle', farmId],
    enabled: !!farmId,
    queryFn: () => fetchActiveCycle(supabase, farmId!),
  });

  const scopesQuery = useQuery({
    queryKey: ['scopes', cycleQuery.data?.id],
    enabled: !!cycleQuery.data?.id,
    queryFn: () => fetchScopesForCycle(supabase, cycleQuery.data!.id),
  });

  useEffect(() => {
    if (!scopesQuery.data?.length) {
      setScopeIdState(null);
      return;
    }
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem(SCOPE_STORAGE_KEY) : null;
    const valid = stored && scopesQuery.data.some((s) => s.id === stored);
    if (valid) {
      setScopeIdState(stored);
      return;
    }
    setScopeIdState(scopesQuery.data[0].id);
  }, [scopesQuery.data]);

  const setScopeId = useCallback((id: string) => {
    localStorage.setItem(SCOPE_STORAGE_KEY, id);
    setScopeIdState(id);
  }, []);

  const primaryScope =
    scopesQuery.data?.find((s) => s.id === scopeId) ?? scopesQuery.data?.[0] ?? null;

  const recentQuery = useQuery({
    queryKey: ['events-recent', farmId, cycleQuery.data?.id],
    enabled: !!farmId && !!cycleQuery.data?.id,
    queryFn: () =>
      fetchRecentEvents(supabase, {
        farmId: farmId!,
        cycleId: cycleQuery.data!.id,
        limit: 80,
      }),
  });

  const todayQuery = useQuery({
    queryKey: ['events-today', farmId, cycleQuery.data?.id],
    enabled: !!farmId && !!cycleQuery.data?.id,
    queryFn: async () => {
      const start = startOfTodayIso();
      const end = endOfTodayIso();
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload, created_at'
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

  const refetchAll = useCallback(() => {
    farmsQuery.refetch();
    cycleQuery.refetch();
    scopesQuery.refetch();
    recentQuery.refetch();
    todayQuery.refetch();
  }, [farmsQuery, cycleQuery, scopesQuery, recentQuery, todayQuery]);

  const value: FarmContextValue = {
    supabase,
    userId,
    authLoading,
    farmListReady: !userId || (farmsQuery.isFetched && pendingInvitesQuery.isFetched),
    farms: farmsQuery.data ?? [],
    farmId,
    setFarmId,
    cycle: cycleQuery.data ?? null,
    scopes: scopesQuery.data ?? [],
    scopeId,
    setScopeId,
    primaryScope,
    todayEvents: todayQuery.data ?? [],
    recentEvents: recentQuery.data ?? [],
    loading:
      authLoading ||
      farmsQuery.isLoading ||
      (!!farmId && cycleQuery.isLoading) ||
      (!!cycleQuery.data && scopesQuery.isLoading),
    refetchAll,
    newlyAcceptedInvitations,
    dismissAcceptedInvitation,
    pendingFarmInvitations,
    dismissPendingInvitation,
    acceptFarmInvitationById,
  };

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarmContext() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarmContext must be used within FarmProvider');
  return ctx;
}
