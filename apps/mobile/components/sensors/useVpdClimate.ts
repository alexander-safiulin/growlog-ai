import { useFarmContext } from '@/providers/FarmProvider';
import {
  loadVpdSourceAssignment,
  saveVpdSourceAssignment,
  type VpdStorageScope,
} from '@/lib/vpd-source-storage';
import {
  getVpdClimateStore,
  setVpdClimateStore,
  subscribeVpdClimateStore,
  vpdClimateStoreKey,
} from '@/lib/vpd-climate-store';
import { listSmartLifeClimate, type SmartLifeDevice } from '@growlog/api-client';
import {
  applyClimatePreview,
  assignmentFromEffective,
  buildClimateSourceRows,
  canAssignLeaf,
  climateZonesMismatch,
  computeVpdKpa,
  effectiveVpdSources,
  formatVpdDisplay,
  leafTempFromMode,
  parseClimatePointsFromDevices,
  parseClimatePreviewInput,
  refsEqual,
  resolveReadingFromAssignment,
  vpdPersistedEqual,
  type ClimatePointRef,
  type ClimatePreview,
  type ClimateSourceRow,
  type TuyaClimateDevice,
  type VpdLeafMode,
  type VpdPersistedSources,
  type VpdSourceAssignment,
  VPD_PREVIEW_RESET_MS,
  vpdBandForStage,
  vpdBandStatus,
  fetchVpdSourcesForCycle,
  fetchVpdSourcesForZone,
  upsertVpdSources,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

const EMPTY_PERSISTED: VpdPersistedSources = {
  assignment: { airTemp: null, leafTemp: null, rh: null },
  leafMode: 'none',
};

export type VpdClimateScope = {
  cycleId?: string | null;
  zoneId?: string | null;
};

function toTuyaClimateDevices(devices: SmartLifeDevice[]): TuyaClimateDevice[] {
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    online: d.online,
    category: d.category,
    status: d.status,
  }));
}

function buildSensorIndex(devices: SmartLifeDevice[]) {
  return new Map(
    devices.map((d) => [
      d.id,
      {
        sensorDeviceId: d.sensorDeviceId ?? null,
        zoneId: d.zoneId ?? null,
        lastSeenAt: d.lastSeenAt ?? null,
        readingAt: d.readingAt ?? null,
        isInfrared: d.isInfrared ?? false,
      },
    ])
  );
}

export function useVpdClimate(
  cycleStage: string | null | undefined,
  scope: VpdClimateScope = {}
) {
  const { supabase, farmId, userId } = useFarmContext();
  const cycleId = scope.cycleId ?? null;
  const zoneId = scope.zoneId ?? null;

  const devicesQuery = useQuery({
    queryKey: ['smartlife-climate', farmId],
    enabled: Boolean(farmId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !farmId) throw new Error('unauthorized');
      return listSmartLifeClimate(token, farmId);
    },
  });

  const storageScope = useMemo<VpdStorageScope | null>(
    () => (farmId ? { farmId, cycleId, zoneId } : null),
    [farmId, cycleId, zoneId]
  );

  const storeKey = farmId ? vpdClimateStoreKey({ farmId, cycleId, zoneId }) : '';

  const points = useMemo(
    () => parseClimatePointsFromDevices(devicesQuery.data?.devices ?? []),
    [devicesQuery.data?.devices]
  );

  const enrichedRows = useMemo(() => {
    const devices = devicesQuery.data?.devices ?? [];
    return buildClimateSourceRows({
      tuyaDevices: toTuyaClimateDevices(devices),
      parsedPoints: points,
      sensorIndex: buildSensorIndex(devices),
      zones: devicesQuery.data?.zones ?? [],
    });
  }, [devicesQuery.data, points]);

  const [ready, setReady] = useState(false);
  const [persisted, setPersistedState] = useState<VpdPersistedSources>(EMPTY_PERSISTED);
  const previewRef = useRef<ClimatePreview | null>(null);
  const [preview, setPreview] = useState<ClimatePreview | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const skipPersistRef = useRef(false);

  const effective = useMemo(
    () =>
      effectiveVpdSources({
        persisted,
        rows: enrichedRows,
        cycleZoneId: zoneId,
      }),
    [persisted, enrichedRows, zoneId]
  );

  const assignment = effective.assignment;
  const leafMode = effective.leafMode;
  const autoSelected = effective.autoSelected;

  const applyPersisted = useCallback(
    (next: VpdPersistedSources, options?: { skipSave?: boolean }) => {
      skipPersistRef.current = options?.skipSave === true;
      setPersistedState(next);
      if (storeKey) setVpdClimateStore(storeKey, next);
    },
    [storeKey]
  );

  const externalPersisted = useSyncExternalStore(
    (onStoreChange) => (storeKey ? subscribeVpdClimateStore(storeKey, onStoreChange) : () => undefined),
    () => (storeKey ? getVpdClimateStore(storeKey) : null),
    () => null
  );

  useEffect(() => {
    if (!externalPersisted) return;
    if (vpdPersistedEqual(externalPersisted, persisted)) return;
    applyPersisted(externalPersisted, { skipSave: true });
  }, [externalPersisted, persisted, applyPersisted]);

  useEffect(() => {
    let cancelled = false;
    if (!farmId || !storageScope) {
      setPersistedState(EMPTY_PERSISTED);
      setReady(false);
      return;
    }

    setReady(false);
    void loadVpdSourceAssignment(storageScope).then((local) => {
      if (cancelled) return;
      if (local) applyPersisted(local, { skipSave: true });
      void (async () => {
        try {
          let remote: VpdPersistedSources | null = null;
          if (userId) {
            if (cycleId) {
              remote = await fetchVpdSourcesForCycle(supabase, { farmId, cycleId });
            } else if (zoneId) {
              remote = await fetchVpdSourcesForZone(supabase, { farmId, zoneId });
            }
          }
          if (cancelled) return;
          if (remote) {
            applyPersisted(remote, { skipSave: true });
            lastSavedRef.current = JSON.stringify(remote);
            void saveVpdSourceAssignment(storageScope, remote);
          }
        } catch {
          /* offline */
        } finally {
          if (!cancelled) setReady(true);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [farmId, cycleId, zoneId, userId, supabase, storageScope, applyPersisted]);

  useEffect(() => {
    if (!ready || !farmId || !storageScope || skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const serialized = JSON.stringify(persisted);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    void saveVpdSourceAssignment(storageScope, persisted);
    if (!userId) return;
    void upsertVpdSources(supabase, {
      farmId,
      cycleId,
      zoneId,
      sources: persisted,
      userId,
    }).catch(() => undefined);
  }, [ready, farmId, storageScope, persisted, userId, supabase, cycleId, zoneId]);

  const live = useMemo(
    () => resolveReadingFromAssignment(assignment, points),
    [assignment, points]
  );

  const airRow = useMemo(
    () =>
      enrichedRows.find(
        (r) =>
          assignment.airTemp &&
          r.kind === 'temp' &&
          r.deviceId === assignment.airTemp.deviceId &&
          r.ref.code === assignment.airTemp.code
      ) ?? null,
    [enrichedRows, assignment.airTemp]
  );
  const rhRow = useMemo(
    () =>
      enrichedRows.find(
        (r) =>
          assignment.rh &&
          r.kind === 'rh' &&
          r.deviceId === assignment.rh.deviceId &&
          r.ref.code === assignment.rh.code
      ) ?? null,
    [enrichedRows, assignment.rh]
  );
  const leafRow = useMemo(
    () =>
      leafMode === 'sensor' && assignment.leafTemp
        ? enrichedRows.find(
            (r) =>
              r.kind === 'temp' &&
              r.deviceId === assignment.leafTemp!.deviceId &&
              r.ref.code === assignment.leafTemp!.code
          ) ?? null
        : null,
    [enrichedRows, assignment.leafTemp, leafMode]
  );

  const airUsable = airRow?.usable ?? false;
  const rhUsable = rhRow?.usable ?? false;
  const zoneWarning = climateZonesMismatch(assignment, enrichedRows);
  const climateWarning = !airUsable || !rhUsable || zoneWarning;

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const effectiveAir = airUsable ? live.airTempC : null;
  const effectiveRh = rhUsable ? live.rhPct : null;
  const effectiveLeafReading = assignment.leafTemp
    ? resolveReadingFromAssignment(assignment, points).leafTempC
    : null;
  const effectiveLeaf = leafTempFromMode({
    leafMode,
    airTempC: effectiveAir,
    leafReadingC: effectiveLeafReading,
  });

  const onPreviewFocus = useCallback(() => clearPreviewTimer(), [clearPreviewTimer]);

  const onPreviewCommit = useCallback(
    (field: keyof ClimatePreview, raw: string) => {
      const parsed = parseClimatePreviewInput(field, raw);
      if (parsed === 'invalid') return;
      const next = applyClimatePreview(previewRef.current, field, parsed, {
        airTempC: effectiveAir,
        leafTempC: effectiveLeaf,
        rhPct: effectiveRh,
      });
      previewRef.current = next;
      setPreview(next);
      if (next) {
        clearPreviewTimer();
        previewTimerRef.current = setTimeout(() => {
          previewRef.current = null;
          setPreview(null);
        }, VPD_PREVIEW_RESET_MS);
      }
    },
    [effectiveAir, effectiveLeaf, effectiveRh, clearPreviewTimer]
  );

  const displayAir = preview?.airTempC ?? live.airTempC;
  const displayLeaf =
    preview?.leafTempC ?? (leafMode === 'estimated' ? effectiveLeaf : live.leafTempC ?? effectiveLeaf);
  const displayRh = preview?.rhPct ?? live.rhPct;
  const isPreview = preview != null;

  const vpdKpa = useMemo(() => {
    if (displayAir == null || displayRh == null) return null;
    if (climateWarning && !isPreview) return null;
    if (leafMode === 'sensor' && assignment.leafTemp && displayLeaf == null) return null;
    return computeVpdKpa({
      airTempC: displayAir,
      rhPct: displayRh,
      leafTempC: leafMode === 'none' ? null : displayLeaf,
    });
  }, [displayAir, displayRh, displayLeaf, leafMode, assignment.leafTemp, climateWarning, isPreview]);

  const band = vpdBandForStage(cycleStage);
  const bandStatus = vpdKpa != null ? vpdBandStatus(vpdKpa, band) : 'none';

  const commitUserPersisted = useCallback(
    (nextAssignment: VpdSourceAssignment, nextLeafMode: VpdLeafMode) => {
      applyPersisted(assignmentFromEffective(nextAssignment, nextLeafMode));
    },
    [applyPersisted]
  );

  const assignAir = useCallback(
    (ref: ClimatePointRef) => {
      const next: VpdSourceAssignment = { ...persisted.assignment, airTemp: ref };
      if (refsEqual(next.leafTemp, ref)) next.leafTemp = null;
      commitUserPersisted(next, persisted.leafMode);
    },
    [persisted, commitUserPersisted]
  );

  const assignLeaf = useCallback(
    (ref: ClimatePointRef | null) => {
      if (ref && !canAssignLeaf(ref, persisted.assignment)) return;
      if (ref && refsEqual(persisted.assignment.airTemp, ref)) return;
      commitUserPersisted({ ...persisted.assignment, leafTemp: ref }, ref ? 'sensor' : 'none');
    },
    [persisted, commitUserPersisted]
  );

  const assignLeafEstimated = useCallback(() => {
    commitUserPersisted({ ...persisted.assignment, leafTemp: null }, 'estimated');
  }, [persisted, commitUserPersisted]);

  const assignRh = useCallback(
    (ref: ClimatePointRef) => {
      commitUserPersisted({ ...persisted.assignment, rh: ref }, persisted.leafMode);
    },
    [persisted, commitUserPersisted]
  );

  return {
    devicesQuery,
    points,
    sourceRows: enrichedRows,
    assignment,
    leafMode,
    autoSelected,
    zoneWarning,
    climateWarning,
    airRow,
    rhRow,
    leafRow,
    live,
    displayAir,
    displayLeaf,
    displayRh,
    isPreview,
    vpdKpa,
    vpdDisplay: vpdKpa != null ? formatVpdDisplay(vpdKpa) : null,
    band,
    bandStatus,
    onPreviewFocus,
    onPreviewCommit,
    assignAir,
    assignLeaf,
    assignLeafEstimated,
    assignRh,
    cycleZoneId: zoneId,
    zones: devicesQuery.data?.zones ?? [],
  };
}

export type { ClimateSourceRow };
