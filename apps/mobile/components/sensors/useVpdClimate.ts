import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  ensureManualClimateLoaded,
  getEmptyManualClimateSnapshot,
  getManualClimateSnapshot,
  subscribeManualClimate,
  writeManualClimate,
} from '@/lib/vpd-manual-storage';
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
  appendLocalJournalEntry,
  applyClimatePreview,
  applyManualClimateEdit,
  assignmentFromEffective,
  buildClimateSourceRows,
  canAssignLeaf,
  climateZonesMismatch,
  computeVpdKpa,
  createLogEntry,
  defaultManualClimate,
  effectiveVpdSources,
  formatManualClimateJournal,
  formatVpdDisplay,
  leafTempFromMode,
  LOCAL_WORKSPACE_IDS,
  parseClimatePointsFromDevices,
  parseClimatePreviewInput,
  refsEqual,
  resolveManualLeafTempC,
  resolveReadingFromAssignment,
  vpdPersistedEqual,
  type ClimatePointRef,
  type ClimatePreview,
  type ClimatePreviewField,
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
  restrictVpdSourcesToDeviceIds,
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
  const { strings } = useMobileLocale();
  const {
    supabase,
    farmId,
    userId,
    isLocalWorkspace,
    primaryScope,
    updateLocalWorkspace,
    refetchAll,
  } = useFarmContext();
  const cycleId = scope.cycleId ?? null;
  const zoneId = scope.zoneId ?? null;

  const cloudClimateEnabled = Boolean(userId && farmId && !isLocalWorkspace);
  const devicesQueryEnabled = cloudClimateEnabled && farmId !== LOCAL_WORKSPACE_IDS.farm;

  const devicesQuery = useQuery({
    queryKey: ['smartlife-climate', farmId],
    enabled: devicesQueryEnabled,
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

  const allowedDeviceIds = useMemo(
    () => new Set((devicesQuery.data?.devices ?? []).map((d) => d.id)),
    [devicesQuery.data?.devices]
  );

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
  const [revertPulse, setRevertPulse] = useState(0);
  const lastSavedRef = useRef<string>('');
  const skipPersistRef = useRef(false);
  const manualKey = cycleId ?? 'device';
  const subscribeManual = useCallback(
    (onStoreChange: () => void) => subscribeManualClimate(manualKey, onStoreChange),
    [manualKey]
  );
  const getManualSnap = useCallback(() => getManualClimateSnapshot(manualKey), [manualKey]);
  const manualSnap = useSyncExternalStore(
    subscribeManual,
    getManualSnap,
    getEmptyManualClimateSnapshot
  );

  useEffect(() => {
    ensureManualClimateLoaded(manualKey);
  }, [manualKey]);

  const devicesLoaded = devicesQuery.isSuccess;
  const persistedForClimate = useMemo(() => {
    if (!devicesLoaded || allowedDeviceIds.size === 0) return persisted;
    return restrictVpdSourcesToDeviceIds(persisted, allowedDeviceIds);
  }, [persisted, devicesLoaded, allowedDeviceIds]);

  const effective = useMemo(
    () =>
      effectiveVpdSources({
        persisted: persistedForClimate,
        rows: enrichedRows,
        cycleZoneId: zoneId,
      }),
    [persistedForClimate, enrichedRows, zoneId]
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
          if (cloudClimateEnabled) {
            if (cycleId && cycleId !== LOCAL_WORKSPACE_IDS.cycle) {
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
  }, [farmId, cycleId, zoneId, cloudClimateEnabled, supabase, storageScope, applyPersisted]);

  useEffect(() => {
    if (!ready || !farmId || !storageScope || skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const serialized = JSON.stringify(persisted);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    void saveVpdSourceAssignment(storageScope, persisted);
    if (!cloudClimateEnabled) return;
    void upsertVpdSources(supabase, {
      farmId,
      cycleId,
      zoneId,
      sources: persisted,
      userId,
    }).catch(() => undefined);
  }, [ready, farmId, storageScope, persisted, cloudClimateEnabled, supabase, cycleId, zoneId]);

  const live = useMemo(
    () => resolveReadingFromAssignment(persisted.assignment, points),
    [persisted.assignment, points]
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

  const userLinked = persisted.assignment.airTemp != null && persisted.assignment.rh != null;
  const sensorDriven =
    Boolean(userId) &&
    devicesQuery.isSuccess &&
    userLinked &&
    live.airTempC != null &&
    live.rhPct != null;

  const onPreviewFocus = useCallback(() => clearPreviewTimer(), [clearPreviewTimer]);

  const onPreviewCommit = useCallback(
    (field: keyof ClimatePreview, raw: string) => {
      if (!sensorDriven) return;
      const parsed = parseClimatePreviewInput(field, raw);
      if (parsed === 'invalid') return;
      const sensorLeaf = leafTempFromMode({
        leafMode,
        airTempC: live.airTempC,
        leafReadingC: live.leafTempC,
      });
      const next = applyClimatePreview(previewRef.current, field, parsed, {
        airTempC: live.airTempC,
        leafTempC: sensorLeaf,
        rhPct: live.rhPct,
      });
      previewRef.current = next;
      setPreview(next);
      if (next) {
        clearPreviewTimer();
        previewTimerRef.current = setTimeout(() => {
          previewRef.current = null;
          setPreview(null);
          setRevertPulse((n) => n + 1);
        }, VPD_PREVIEW_RESET_MS);
      }
    },
    [sensorDriven, leafMode, live.airTempC, live.leafTempC, live.rhPct, clearPreviewTimer]
  );

  useEffect(() => {
    if (sensorDriven) return;
    clearPreviewTimer();
    if (previewRef.current) {
      previewRef.current = null;
      setPreview(null);
    }
  }, [sensorDriven, clearPreviewTimer]);

  const stageDefault = useMemo(() => defaultManualClimate(cycleStage), [cycleStage]);
  const manualReading = manualSnap.reading ?? stageDefault;
  const manualLeaf = resolveManualLeafTempC(manualReading);

  const displayAir = sensorDriven ? (preview?.airTempC ?? live.airTempC) : manualReading.airTempC;
  const displayRh = sensorDriven ? (preview?.rhPct ?? live.rhPct) : manualReading.rhPct;
  const displayLeaf = sensorDriven
    ? (preview?.leafTempC ??
      leafTempFromMode({
        leafMode,
        airTempC: live.airTempC,
        leafReadingC: live.leafTempC,
      }))
    : manualLeaf;
  const isPreview = sensorDriven && preview != null;

  const vpdKpa = useMemo(() => {
    if (displayAir == null || displayRh == null) return null;
    if (sensorDriven && climateWarning && !isPreview) return null;
    if (sensorDriven && leafMode === 'sensor' && assignment.leafTemp && displayLeaf == null) return null;
    return computeVpdKpa({
      airTempC: displayAir,
      rhPct: displayRh,
      leafTempC: sensorDriven && leafMode === 'none' ? null : displayLeaf,
    });
  }, [
    displayAir,
    displayRh,
    displayLeaf,
    leafMode,
    assignment.leafTemp,
    climateWarning,
    isPreview,
    sensorDriven,
  ]);

  const journalLabels = useMemo(
    () => ({
      air: strings.vpd.airTemp,
      humidity: strings.vpd.humidity,
      leaf: strings.vpd.leafTemp,
      vpd: 'VPD',
    }),
    [strings.vpd.airTemp, strings.vpd.humidity, strings.vpd.leafTemp]
  );

  const recordManualJournal = useCallback(
    (reading: typeof manualReading, field: ClimatePreviewField) => {
      const leafTempC = resolveManualLeafTempC(reading);
      const vpdKpa = computeVpdKpa({
        airTempC: reading.airTempC,
        rhPct: reading.rhPct,
        leafTempC,
      });
      const entry = formatManualClimateJournal({
        reading,
        field,
        vpdKpa,
        labels: journalLabels,
      });
      const occurredAt = new Date().toISOString();
      if (isLocalWorkspace) {
        void updateLocalWorkspace((store) =>
          appendLocalJournalEntry(store, {
            event_type: 'sensor_snapshot',
            occurred_at: occurredAt,
            body: entry.body,
            source_type: 'user_form',
            payload: entry.payload,
          })
        );
        return;
      }
      if (
        !userId ||
        !farmId ||
        !cycleId ||
        !primaryScope?.id ||
        farmId === LOCAL_WORKSPACE_IDS.farm ||
        cycleId === LOCAL_WORKSPACE_IDS.cycle
      ) {
        return;
      }
      void createLogEntry(supabase, {
        farmId,
        cycleId,
        scopeId: primaryScope.id,
        eventType: 'sensor_snapshot',
        body: entry.body,
        occurredAt,
        sourceType: 'user_form',
        createdBy: userId,
        payload: entry.payload,
      })
        .then(() => refetchAll())
        .catch(() => undefined);
    },
    [
      journalLabels,
      isLocalWorkspace,
      updateLocalWorkspace,
      userId,
      farmId,
      cycleId,
      primaryScope?.id,
      supabase,
      refetchAll,
    ]
  );

  const onValueCommit = useCallback(
    (field: ClimatePreviewField, raw: string) => {
      const parsed = parseClimatePreviewInput(field, raw);
      if (parsed === 'invalid') return;
      if (sensorDriven) {
        onPreviewCommit(field, raw);
        return;
      }
      const next = applyManualClimateEdit(manualReading, field, parsed === 'clear' ? 'clear' : parsed);
      if (
        next.airTempC === manualReading.airTempC &&
        next.rhPct === manualReading.rhPct &&
        next.leafTempC === manualReading.leafTempC
      ) {
        return;
      }
      void writeManualClimate(manualKey, next);
      recordManualJournal(next, field);
    },
    [sensorDriven, onPreviewCommit, manualReading, manualKey, recordManualJournal]
  );

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
      let nextLeafMode = persisted.leafMode;
      if (refsEqual(next.leafTemp, ref)) {
        next.leafTemp = null;
        if (nextLeafMode === 'sensor') nextLeafMode = 'estimated';
      }
      if (!next.rh) {
        const rhOnDevice = enrichedRows.find((r) => r.deviceId === ref.deviceId && r.kind === 'rh');
        if (rhOnDevice) next.rh = rhOnDevice.ref;
      }
      if (nextLeafMode === 'none') nextLeafMode = 'estimated';
      commitUserPersisted(next, nextLeafMode);
    },
    [persisted, commitUserPersisted, enrichedRows]
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
      const next: VpdSourceAssignment = { ...persisted.assignment, rh: ref };
      if (!next.airTemp) {
        const tempOnDevice = enrichedRows.find(
          (r) => r.deviceId === ref.deviceId && r.kind === 'temp' && !refsEqual(r.ref, next.leafTemp)
        );
        if (tempOnDevice) next.airTemp = tempOnDevice.ref;
      }
      const nextLeafMode = persisted.leafMode === 'none' ? 'estimated' : persisted.leafMode;
      commitUserPersisted(next, nextLeafMode);
    },
    [persisted, commitUserPersisted, enrichedRows]
  );

  return {
    devicesQuery,
    points,
    sourceRows: enrichedRows,
    assignment: persisted.assignment,
    leafMode: persisted.leafMode,
    autoSelected: sensorDriven && autoSelected,
    mode: sensorDriven ? ('sensor' as const) : ('manual' as const),
    manualCustomized: manualSnap.reading != null,
    manualLeafEstimated: manualReading.leafTempC == null,
    sensorLinkSaved: userLinked,
    devicesQueryEnabled,
    revertPulse,
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
    onValueCommit,
    assignAir,
    assignLeaf,
    assignLeafEstimated,
    assignRh,
    cycleZoneId: zoneId,
    zones: devicesQuery.data?.zones ?? [],
  };
}

export type { ClimateSourceRow };
