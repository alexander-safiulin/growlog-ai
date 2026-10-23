import { useEffect, useMemo, useRef, useState } from 'react';
import {
  mapDbProfileToTarget,
  solveMagicWand,
  type SolveForwardResult,
  type SolveMagicWandInput,
  type TargetPpm,
} from '@growlog/nutrient-calc';
import type { CatalogBundle } from '../catalog-types';
import { sourceWaterFromProfile, type FullWaterProfileInput } from '../water-profile-solver';
import { unifiedToFertilizerSpecs, type UnifiedProduct } from '../unified-products';
import type { FarmFeedSystemStepRow } from '@growlog/domain';
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
  } = params;
  return JSON.stringify({
    selected: [...selectedProductIds].sort(),
    profile: catalogProfileSlug ?? null,
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

function buildSolveInput(params: NutrientSolveParams): SolveMagicWandInput | null {
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
  } = params;

  const selected = unifiedProducts.filter((p) => selectedProductIds.includes(p.id));
  if (!selected.length) return null;

  const profile = catalog.target_profiles.find((p) => p.slug === catalogProfileSlug);
  let target: TargetPpm | Record<string, number> = profile ? mapDbProfileToTarget(profile) : {};
  let overdose = profile?.overdose_pct ?? {};
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
      fastSolver: false,
    },
  };
}

function runSolveSync(input: SolveMagicWandInput): SolveForwardResult | null {
  try {
    return solveMagicWand(input);
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

  const [debouncedInput, setDebouncedInput] = useState<SolveMagicWandInput | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const lastPostedPayloadKeyRef = useRef<string | null>(null);
  const [result, setResult] = useState<SolveForwardResult | null>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    lastPostedPayloadKeyRef.current = null;
    setComputing(true);
    const handle = window.setTimeout(() => {
      const next = solveInputRef.current;
      setDebouncedInput((prev) => {
        if (!next) return null;
        if (!prev) return next;
        const pk = nutrientSolveWorkerPayloadKey(prev);
        const nk = nutrientSolveWorkerPayloadKey(next);
        return pk === nk ? prev : next;
      });
    }, WAND_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
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
      if (event.data.result) setResult(event.data.result);
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
      return;
    }
    lastPostedPayloadKeyRef.current = payloadKey;

    if (typeof Worker === 'undefined') {
      setResult(runSolveSync(debouncedInput));
      setComputing(false);
      return;
    }

    const worker = workerRef.current;
    if (!worker) {
      setResult(runSolveSync(debouncedInput));
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
