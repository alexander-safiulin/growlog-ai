'use client';

import { useTuyaClimateDevices } from '@/components/sensors/useTuyaDevices';
import { useFarmContext } from '@/components/providers/FarmProvider';
import {
  loadVpdSourceAssignment,
  saveVpdSourceAssignmentLocal,
  subscribeVpdSourceAssignment,
  type VpdStorageScope,
} from '@/lib/growlog/vpd-source-storage';
import {
  getVpdClimateStore,
  setVpdClimateStore,
  subscribeVpdClimateStore,
  vpdClimateStoreKey,
} from '@/lib/growlog/vpd-climate-store';
import { toTuyaClimateDevices } from '@/lib/growlog/vpd-tuya-enrich';
import {
  applyClimatePreview,
  assignmentsEqual,
  buildClimateSourceRows,
  canAssignLeaf,
  climateZonesMismatch,
  computeVpdKpa,
  formatVpdDisplay,
  leafTempFromMode,
  parseClimatePointsFromDevices,
  parseClimatePreviewInput,
  refsEqual,
  resolveReadingFromAssignment,
  smartDefaultVpdSources,
  type ClimatePointRef,
  type ClimatePreview,
  type ClimateSourceRow,
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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

const EMPTY_SOURCES: VpdPersistedSources = {
  assignment: { airTemp: null, leafTemp: null, rh: null },
  leafMode: 'none',
};

export type VpdClimateScope = {
  cycleId?: string | null;
  zoneId?: string | null;
};

export function useVpdClimate(
  cycleStage: string | null | undefined,
  scope: VpdClimateScope = {}
) {
  const { supabase, farmId, userId } = useFarmContext();
  const cycleId = scope.cycleId ?? null;
  const zoneId = scope.zoneId ?? null;
  const devicesQuery = useTuyaClimateDevices();

  const storageScope: VpdStorageScope | null = farmId
    ? { farmId, cycleId, zoneId }
    : null;

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
      sensorIndex: new Map(
        devices.map((d) => [
          d.id,
          {
            sensorDeviceId: d.sensorDeviceId,
            zoneId: d.zoneId,
            lastSeenAt: d.lastSeenAt,
            isInfrared: d.isInfrared,
          },
        ])
      ),
      zones: devicesQuery.data?.zones ?? [],
    });
  }, [devicesQuery.data, points]);

  const [ready, setReady] = useState(false);
  const [sources, setSourcesState] = useState<VpdPersistedSources>(EMPTY_SOURCES);
  const [autoSelected, setAutoSelected] = useState(false);
  const [preview, setPreview] = useState<ClimatePreview | null>(null);
  const previewRef = useRef<ClimatePreview | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSources = useCallback(
    (next: VpdPersistedSources) => {
      setSourcesState(next);
      if (storeKey) setVpdClimateStore(storeKey, next);
    },
    [storeKey]
  );

  const externalSources = useSyncExternalStore(
    (onStoreChange) => (storeKey ? subscribeVpdClimateStore(storeKey, onStoreChange) : () => undefined),
    () => (storeKey ? getVpdClimateStore(storeKey) : null),
    () => null
  );

  useEffect(() => {
    if (!externalSources) return;
    setSourcesState(externalSources);
  }, [externalSources]);

  useEffect(() => {
    let cancelled = false;
    if (!farmId || !storageScope) {
      setSourcesState(EMPTY_SOURCES);
      setReady(false);
      return;
    }

    setReady(false);
    const local = loadVpdSourceAssignment(storageScope);
    if (local) {
      setSources(local);
    }

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
          setSources(remote);
          saveVpdSourceAssignmentLocal(storageScope, remote);
        } else if (local) {
          setSources(local);
        }
      } catch {
        /* guest / offline */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const unsub = subscribeVpdSourceAssignment(storageScope, (next) => setSources(next));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [farmId, cycleId, zoneId, userId, supabase, storageScope, setSources]);

  useEffect(() => {
    if (!ready || !enrichedRows.length) return;
    setSourcesState((prev) => {
      const smart = smartDefaultVpdSources({
        rows: enrichedRows,
        cycleZoneId: zoneId,
        saved: prev,
      });
      setAutoSelected(smart.autoSelected);
      const next: VpdPersistedSources = {
        assignment: smart.assignment,
        leafMode: smart.leafMode,
      };
      if (
        assignmentsEqual(prev.assignment, next.assignment) &&
        prev.leafMode === next.leafMode
      ) {
        return prev;
      }
      if (storeKey) setVpdClimateStore(storeKey, next);
      return next;
    });
  }, [ready, enrichedRows, zoneId, storeKey]);

  useEffect(() => {
    if (!ready || !farmId || !storageScope) return;
    saveVpdSourceAssignmentLocal(storageScope, sources);
    if (!userId) return;
    void upsertVpdSources(supabase, {
      farmId,
      cycleId,
      zoneId,
      sources,
      userId,
    }).catch(() => undefined);
  }, [ready, farmId, storageScope, sources, userId, supabase, cycleId, zoneId]);

  const assignment = sources.assignment;
  const leafMode = sources.leafMode;

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

  const schedulePreviewReset = useCallback(() => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      previewRef.current = null;
      setPreview(null);
      previewTimerRef.current = null;
    }, VPD_PREVIEW_RESET_MS);
  }, [clearPreviewTimer]);

  const onPreviewFocus = useCallback(() => clearPreviewTimer(), [clearPreviewTimer]);

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
      if (next) schedulePreviewReset();
      else clearPreviewTimer();
    },
    [effectiveAir, effectiveLeaf, effectiveRh, schedulePreviewReset, clearPreviewTimer]
  );

  useEffect(() => () => clearPreviewTimer(), [clearPreviewTimer]);

  const displayAir = preview?.airTempC ?? live.airTempC;
  const displayLeaf = preview?.leafTempC ?? (leafMode === 'estimated' ? effectiveLeaf : live.leafTempC ?? effectiveLeaf);
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
  }, [
    displayAir,
    displayRh,
    displayLeaf,
    leafMode,
    assignment.leafTemp,
    climateWarning,
    isPreview,
  ]);

  const band = vpdBandForStage(cycleStage);
  const bandStatus = vpdKpa != null ? vpdBandStatus(vpdKpa, band) : 'none';

  const persistAssignment = useCallback(
    (nextAssignment: VpdSourceAssignment, nextLeafMode: VpdLeafMode = leafMode) => {
      setAutoSelected(false);
      setSources({ assignment: nextAssignment, leafMode: nextLeafMode });
    },
    [leafMode, setSources]
  );

  const assignAir = useCallback(
    (ref: ClimatePointRef) => {
      const next: VpdSourceAssignment = { ...assignment, airTemp: ref };
      if (refsEqual(next.leafTemp, ref)) next.leafTemp = null;
      persistAssignment(next);
    },
    [assignment, persistAssignment]
  );

  const assignLeaf = useCallback(
    (ref: ClimatePointRef | null) => {
      if (ref && !canAssignLeaf(ref, assignment)) return;
      if (ref && refsEqual(assignment.airTemp, ref)) return;
      persistAssignment(
        { ...assignment, leafTemp: ref },
        ref ? 'sensor' : 'none'
      );
    },
    [assignment, persistAssignment]
  );

  const assignLeafEstimated = useCallback(() => {
    persistAssignment({ ...assignment, leafTemp: null }, 'estimated');
  }, [assignment, persistAssignment]);

  const assignRh = useCallback(
    (ref: ClimatePointRef) => {
      persistAssignment({ ...assignment, rh: ref });
    },
    [assignment, persistAssignment]
  );

  const tempPoints = useMemo(
    () => enrichedRows.filter((r) => r.kind === 'temp'),
    [enrichedRows]
  );
  const rhPoints = useMemo(() => enrichedRows.filter((r) => r.kind === 'rh'), [enrichedRows]);

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
    tempPoints,
    rhPoints,
    cycleZoneId: zoneId,
    zones: devicesQuery.data?.zones ?? [],
  };
}

export type { ClimateSourceRow };
