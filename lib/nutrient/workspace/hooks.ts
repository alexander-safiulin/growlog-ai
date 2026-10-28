import { useEffect, useMemo, useRef, useState } from 'react';
import {
  mapDbProfileToTarget,
  solveMagicWand,
  type SolveForwardResult,
  type SolveMagicWandInput,
  type TargetPpm,
} from '@growlog/nutrient-calc';
import type { CatalogBundle } from '../catalog-types';
import type { CustomTargetProfile } from '../custom-target-profile';
import { findWorkspaceTargetProfile } from '../custom-target-profile';
import { overdosePctForWorkspaceProfile } from '../target-profile-overdose';
import { sourceWaterFromProfile, type FullWaterProfileInput } from '../water-profile-solver';
import { unifiedToFertilizerSpecs, type UnifiedProduct } from '../unified-products';
import type { FarmFeedSystemStepRow } from '@growlog/domain';
import { padSolveForwardResultWithSelectedDoses } from '@/lib/nutrient/pad-solution-selected-doses';
import type { NutrientWandWorkerRequest, NutrientWandWorkerResponse } from './nutrient-wand.worker';

export interface NutrientSolveParams {
  catalog: CatalogBundle;
  unifiedProducts: UnifiedProduct[];
  selectedProductIds: string[];
  catalogProfileSlug?: string;
  farmStep?: FarmFeedSystemStepRow | null;
  water?: FullWaterProfileInput | null;
  volumeL: number;
  model: 'canonical' | 'hydroodo_legacy';
  tankMode: 'single' | 'ab';
  stockFactor: number;
  substituteCatalogIds?: string[];
  myTargetProfiles?: CustomTargetProfile[];
}

const WAND_DEBOUNCE_MS = 200;
/** Five ranked tabs: best + up to four alternatives. */
const MAX_WAND_TOTAL_OPTIONS = 5;

/** Stable key for wand solve inputs (ignores object identity of `params`). */
export function nutrientSolveInputKey(params: NutrientSolveParams): string {
  const {
    selectedProductIds,
    catalogProfileSlug,
    farmStep,
    water,
    volumeL,
    model,
    tankMode,
    stockFactor,
    substituteCatalogIds,
    unifiedProducts,
    myTargetProfiles,
  } = params;
  return JSON.stringify({
    selected: [...selectedProductIds].sort(),
    profile: catalogProfileSlug ?? null,
    myTargets: myTargetProfiles?.map((p) => p.slug).sort() ?? [],
    farmStepId: farmStep?.id ?? null,
    farmStepTarget: farmStep?.target_ppm ?? null,
    water: water ?? null,
    volumeL,
    model,
    tankMode,
    stockFactor,
    substituteCatalogIds: substituteCatalogIds ? [...substituteCatalogIds].sort() : null,
    unified: unifiedProducts.map((p) => p.id).sort(),
  });
}

/** Serialized worker payload for deduping postMessage. */
export function nutrientSolveWorkerPayloadKey(input: SolveMagicWandInput): string {
  return JSON.stringify(input);
}

export function buildSolveInput(params: NutrientSolveParams): SolveMagicWandInput | null {
  const {
    catalog,
    unifiedProducts,
    selectedProductIds,
    catalogProfileSlug,
    farmStep,
    water,
    volumeL,
    model,
    tankMode,
    stockFactor,
    substituteCatalogIds,
    myTargetProfiles,
  } = params;

  const selected = unifiedProducts.filter((p) => selectedProductIds.includes(p.id));
  if (!selected.length) return null;

  const profile =
    catalogProfileSlug && !farmStep
      ? findWorkspaceTargetProfile(
          catalogProfileSlug,
          catalog.target_profiles,
          myTargetProfiles ?? [],
        )
      : undefined;
  if (!farmStep && catalogProfileSlug && !profile) return null;
  let target: TargetPpm | Record<string, number> = profile ? mapDbProfileToTarget(profile) : {};
  let overdose = overdosePctForWorkspaceProfile(profile);
  if (farmStep) {
    target = farmStep.target_ppm as TargetPpm;
    overdose = {};
  }

  const fertilizers = unifiedToFertilizerSpecs(selected);
  const catalogIds =
    substituteCatalogIds ??
    unifiedProducts.filter((p) => p.scope === 'catalog').map((p) => p.id);
  const substitutePool = unifiedToFertilizerSpecs(
    unifiedProducts.filter((p) => p.scope === 'catalog' && catalogIds.includes(p.id)),
  );

  const sw = water ? sourceWaterFromProfile(water) : { ppm: {} };
  const ppm = sw.ppm ?? {};

  return {
    target,
    sourceWater: {
      ppm,
      alkalinityHco3Ppm: sw.alkalinityHco3Ppm,
      alkalinityAsCaco3Equivalent: true,
    },
    fertilizers,
    substitutePool,
    options: {
      model,
      overdosePctByGroup: overdose,
      volumeL,
      tankMode,
      stockTank: tankMode === 'ab' ? { concentrationFactor: stockFactor, twoTankMode: true } : undefined,
      maxAlternatives: MAX_WAND_TOTAL_OPTIONS - 1,
    },
  };
}

function finalizeSolveResult(
  result: SolveForwardResult,
  input: SolveMagicWandInput,
  selectedProductIds: string[],
): SolveForwardResult {
  return padSolveForwardResultWithSelectedDoses(
    result,
    input.fertilizers,
    selectedProductIds,
    input.options?.volumeL,
  );
}

function runSolveSync(
  input: SolveMagicWandInput,
  selectedProductIds: string[],
): SolveForwardResult | null {
  try {
    return finalizeSolveResult(solveMagicWand(input), input, selectedProductIds);
  } catch {
    return null;
  }
}

export type NutrientSolveState = {
  result: SolveForwardResult | null;
  computing: boolean;
};

export function useNutrientSolve(params: NutrientSolveParams): NutrientSolveState {
  const inputKey = nutrientSolveInputKey(params);
  const solveInput = useMemo(() => buildSolveInput(params), [inputKey]);
  const solveInputRef = useRef(solveInput);
  solveInputRef.current = solveInput;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [debouncedInput, setDebouncedInput] = useState<SolveMagicWandInput | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const lastPostedPayloadKeyRef = useRef<string | null>(null);
  const [result, setResult] = useState<SolveForwardResult | null>(null);
  const [computing, setComputing] = useState(false);

  const debounceImmediateOnceRef = useRef(true);

  useEffect(() => {
    lastPostedPayloadKeyRef.current = null;
    const next = solveInputRef.current;
    if (!next) {
      setDebouncedInput(null);
      return;
    }

    const applyDebounced = () => {
      const latest = solveInputRef.current;
      setDebouncedInput((prev) => {
        if (!latest) return null;
        if (!prev) return latest;
        const pk = nutrientSolveWorkerPayloadKey(prev);
        const nk = nutrientSolveWorkerPayloadKey(latest);
        return pk === nk ? prev : latest;
      });
    };

    if (debounceImmediateOnceRef.current) {
      debounceImmediateOnceRef.current = false;
      applyDebounced();
      return;
    }

    const handle = setTimeout(applyDebounced, WAND_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputKey]);

  useEffect(() => {
    if (typeof Worker === 'undefined') return undefined;

    const worker = new Worker(new URL('./nutrient-wand.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const onMessage = (event: MessageEvent<NutrientWandWorkerResponse>) => {
      if (event.data.id !== requestIdRef.current) return;
      setComputing(false);
      if (event.data.error) {
        setResult(null);
        return;
      }
      if (event.data.result) {
        const input = solveInputRef.current;
        if (!input) {
          setResult(event.data.result);
          return;
        }
        setResult(finalizeSolveResult(event.data.result, input, paramsRef.current.selectedProductIds));
      }
    };

    worker.addEventListener('message', onMessage);
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!debouncedInput) {
      setResult(null);
      setComputing(false);
      lastPostedPayloadKeyRef.current = null;
      return;
    }

    const payloadKey = nutrientSolveWorkerPayloadKey(debouncedInput);
    if (lastPostedPayloadKeyRef.current === payloadKey) {
      setComputing(false);
      return;
    }
    lastPostedPayloadKeyRef.current = payloadKey;

    if (typeof Worker === 'undefined') {
      setResult(runSolveSync(debouncedInput, paramsRef.current.selectedProductIds));
      setComputing(false);
      return;
    }

    const worker = workerRef.current;
    if (!worker) {
      setResult(runSolveSync(debouncedInput, paramsRef.current.selectedProductIds));
      setComputing(false);
      return;
    }

    const id = ++requestIdRef.current;
    const payload: NutrientWandWorkerRequest = { id, input: debouncedInput };
    setComputing(true);
    worker.postMessage(payload);
  }, [debouncedInput]);

  return { result, computing };
}
