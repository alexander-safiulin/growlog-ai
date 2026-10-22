'use client';

import { useTuyaDevices } from '@/components/sensors/useTuyaDevices';
import { useFarmContext } from '@/components/providers/FarmProvider';
import {
  loadVpdSourceAssignment,
  saveVpdSourceAssignment,
} from '@/lib/growlog/vpd-source-storage';
import {
  applyClimatePreview,
  assignmentsEqual,
  canAssignLeaf,
  computeVpdKpa,
  formatVpdDisplay,
  mergeAssignmentWithDefaults,
  parseClimatePointsFromDevices,
  parseClimatePreviewInput,
  refsEqual,
  resolveReadingFromAssignment,
  type ClimatePointRef,
  type ClimatePreview,
  type ParsedClimatePoint,
  type VpdSourceAssignment,
  VPD_PREVIEW_RESET_MS,
  vpdBandForStage,
  vpdBandStatus,
} from '@growlog/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const EMPTY_ASSIGNMENT: VpdSourceAssignment = {
  airTemp: null,
  leafTemp: null,
  rh: null,
};

export function useVpdClimate(cycleStage: string | null | undefined) {
  const { farmId } = useFarmContext();
  const devicesQuery = useTuyaDevices();

  const points = useMemo(
    () => parseClimatePointsFromDevices(devicesQuery.data ?? []),
    [devicesQuery.data]
  );

  const [assignment, setAssignment] = useState<VpdSourceAssignment>(EMPTY_ASSIGNMENT);
  const [readyFarmId, setReadyFarmId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClimatePreview | null>(null);
  const previewRef = useRef<ClimatePreview | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const clearPreview = useCallback(() => {
    previewRef.current = null;
    setPreview(null);
    clearPreviewTimer();
  }, [clearPreviewTimer]);

  useEffect(() => {
    clearPreview();
    if (!farmId) {
      setAssignment(EMPTY_ASSIGNMENT);
      setReadyFarmId(null);
      return;
    }
    setReadyFarmId(null);
    setAssignment(loadVpdSourceAssignment(farmId) ?? EMPTY_ASSIGNMENT);
    setReadyFarmId(farmId);
  }, [farmId, clearPreview]);

  useEffect(() => {
    if (readyFarmId !== farmId || !farmId) return;
    setAssignment((prev) => {
      const next = mergeAssignmentWithDefaults(prev, points);
      return assignmentsEqual(prev, next) ? prev : next;
    });
  }, [farmId, points, readyFarmId]);

  useEffect(() => {
    if (!farmId || readyFarmId !== farmId) return;
    saveVpdSourceAssignment(farmId, assignment);
  }, [farmId, readyFarmId, assignment]);

  const live = useMemo(
    () => resolveReadingFromAssignment(assignment, points),
    [assignment, points]
  );

  const schedulePreviewReset = useCallback(() => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      previewRef.current = null;
      setPreview(null);
      previewTimerRef.current = null;
    }, VPD_PREVIEW_RESET_MS);
  }, [clearPreviewTimer]);

  const onPreviewFocus = useCallback((_field?: keyof ClimatePreview) => {
    clearPreviewTimer();
  }, [clearPreviewTimer]);

  const onPreviewCommit = useCallback(
    (field: keyof ClimatePreview, raw: string) => {
      const parsed = parseClimatePreviewInput(field, raw);
      if (parsed === 'invalid') return;
      const next = applyClimatePreview(previewRef.current, field, parsed, {
        airTempC: live.airTempC,
        leafTempC: live.leafTempC,
        rhPct: live.rhPct,
      });
      previewRef.current = next;
      setPreview(next);
      if (next) schedulePreviewReset();
      else clearPreviewTimer();
    },
    [live.airTempC, live.leafTempC, live.rhPct, schedulePreviewReset, clearPreviewTimer]
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
