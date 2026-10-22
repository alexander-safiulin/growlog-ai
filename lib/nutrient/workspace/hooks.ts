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
const MAX_WAND_ALTERNATIVES = 3;

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
      maxAlternatives: MAX_WAND_ALTERNATIVES,
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

export function useNutrientSolve(params: NutrientSolveParams): SolveForwardResult | null {
  const solveInput = useMemo(() => buildSolveInput(params), [params]);
  const [debouncedInput, setDebouncedInput] = useState(solveInput);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [result, setResult] = useState<SolveForwardResult | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedInput(solveInput), WAND_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [solveInput]);

  useEffect(() => {
    if (!debouncedInput) {
      setResult(null);
      return;
    }

    if (typeof Worker === 'undefined') {
      setResult(runSolveSync(debouncedInput));
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./nutrient-wand.worker.ts', import.meta.url), {
        type: 'module',
      });
    }
    const worker = workerRef.current;
    const id = ++requestIdRef.current;

    const onMessage = (event: MessageEvent<NutrientWandWorkerResponse>) => {
      if (event.data.id !== id) return;
      if (event.data.error) {
        setResult(null);
        return;
      }
      if (event.data.result) setResult(event.data.result);
    };

    worker.addEventListener('message', onMessage);
    const payload: NutrientWandWorkerRequest = { id, input: debouncedInput };
    worker.postMessage(payload);

    return () => {
      worker.removeEventListener('message', onMessage);
    };
  }, [debouncedInput]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return result;
}
