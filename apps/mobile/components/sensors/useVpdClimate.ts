import { useFarmContext } from '@/providers/FarmProvider';
import {
  loadVpdSourceAssignment,
  saveVpdSourceAssignment,
} from '@/lib/vpd-source-storage';
import { listSmartLifeDevices } from '@growlog/api-client';
import {
  canAssignLeaf,
  computeVpdKpa,
  formatVpdDisplay,
  mergeAssignmentWithDefaults,
  parseClimatePointsFromDevices,
  refsEqual,
  resolveReadingFromAssignment,
  type ClimatePointRef,
  type ParsedClimatePoint,
  type VpdSourceAssignment,
  VPD_PREVIEW_RESET_MS,
  vpdBandForStage,
  vpdBandStatus,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PreviewValues = {
  airTempC: number | null;
  leafTempC: number | null;
  rhPct: number | null;
};

type PreviewField = keyof PreviewValues;

const EMPTY_ASSIGNMENT: VpdSourceAssignment = {
  airTemp: null,
  leafTemp: null,
  rh: null,
};

export function useVpdClimate(cycleStage: string | null | undefined) {
  const { supabase, farmId } = useFarmContext();
  const devicesQuery = useQuery({
    queryKey: ['smartlife-devices', farmId],
    enabled: Boolean(farmId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !farmId) throw new Error('unauthorized');
      return listSmartLifeDevices(token, farmId);
    },
  });

  const points = useMemo(
    () => parseClimatePointsFromDevices(devicesQuery.data ?? []),
    [devicesQuery.data]
  );

  const [assignment, setAssignment] = useState<VpdSourceAssignment>(EMPTY_ASSIGNMENT);
  const [readyFarmId, setReadyFarmId] = useState<string | null>(null);
  const defaultsAppliedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    defaultsAppliedRef.current = false;
    if (!farmId) {
      setAssignment(EMPTY_ASSIGNMENT);
      setReadyFarmId(null);
      return;
    }
    setReadyFarmId(null);
    void loadVpdSourceAssignment(farmId).then((stored) => {
      if (cancelled) return;
      setAssignment(stored ?? EMPTY_ASSIGNMENT);
      setReadyFarmId(farmId);
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  useEffect(() => {
    if (readyFarmId !== farmId || !farmId || points.length === 0 || defaultsAppliedRef.current) {
      return;
    }
    setAssignment((prev) => mergeAssignmentWithDefaults(prev, points));
    defaultsAppliedRef.current = true;
  }, [farmId, points, readyFarmId]);

  useEffect(() => {
    if (!farmId || readyFarmId !== farmId) return;
    void saveVpdSourceAssignment(farmId, assignment);
  }, [farmId, readyFarmId, assignment]);

  const live = useMemo(
    () => resolveReadingFromAssignment(assignment, points),
    [assignment, points]
  );

  const [preview, setPreview] = useState<PreviewValues | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const schedulePreviewReset = useCallback(() => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      setPreview(null);
      previewTimerRef.current = null;
    }, VPD_PREVIEW_RESET_MS);
  }, [clearPreviewTimer]);

  const onPreviewFocus = useCallback(
    (_field: PreviewField) => {
      clearPreviewTimer();
    },
    [clearPreviewTimer]
  );

  const onPreviewCommit = useCallback(
    (field: PreviewField, raw: string) => {
      const trimmed = raw.trim().replace(',', '.');
      const num = trimmed === '' ? null : Number(trimmed);
      const value = num != null && Number.isFinite(num) ? num : null;
      setPreview((prev) => {
        const base: PreviewValues = prev ?? {
          airTempC: live.airTempC,
          leafTempC: live.leafTempC,
          rhPct: live.rhPct,
        };
        return { ...base, [field]: value };
      });
      schedulePreviewReset();
    },
    [live.airTempC, live.leafTempC, live.rhPct, schedulePreviewReset]
  );

  useEffect(() => () => clearPreviewTimer(), [clearPreviewTimer]);

  const displayAir = preview?.airTempC ?? live.airTempC;
  const displayLeaf = preview?.leafTempC ?? live.leafTempC;
  const displayRh = preview?.rhPct ?? live.rhPct;
  const isPreview = preview != null;

  const vpdKpa = useMemo(() => {
    if (displayAir == null || displayRh == null) return null;
    if (assignment.leafTemp && displayLeaf == null) return null;
    return computeVpdKpa({
      airTempC: displayAir,
      rhPct: displayRh,
      leafTempC: assignment.leafTemp ? displayLeaf : null,
    });
  }, [displayAir, displayRh, displayLeaf, assignment.leafTemp]);

  const band = vpdBandForStage(cycleStage);
  const bandStatus = vpdKpa != null ? vpdBandStatus(vpdKpa, band) : 'none';

  const assignAir = useCallback((ref: ClimatePointRef) => {
    setAssignment((prev) => {
      const next: VpdSourceAssignment = { ...prev, airTemp: ref };
      if (refsEqual(next.leafTemp, ref)) next.leafTemp = null;
      return next;
    });
  }, []);

  const assignLeaf = useCallback((ref: ClimatePointRef | null) => {
    setAssignment((prev) => {
      if (ref && !canAssignLeaf(ref, prev)) return prev;
      if (ref && refsEqual(prev.airTemp, ref)) return prev;
      return { ...prev, leafTemp: ref };
    });
  }, []);

  const assignRh = useCallback((ref: ClimatePointRef) => {
    setAssignment((prev) => ({ ...prev, rh: ref }));
  }, []);

  const tempPoints = useMemo(
    () => points.filter((p) => p.kind === 'temp') as ParsedClimatePoint[],
    [points]
  );
  const rhPoints = useMemo(
    () => points.filter((p) => p.kind === 'rh') as ParsedClimatePoint[],
    [points]
  );

  return {
    devicesQuery,
    points,
    assignment,
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
    assignRh,
    tempPoints,
    rhPoints,
  };
}
