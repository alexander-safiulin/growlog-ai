import type { SolveForwardResult } from '@growlog/nutrient-calc';
import {
  nutrientSolveInputKey,
  type NutrientSolveParams,
} from '@growlog/web-lib/nutrient/workspace/hooks';
import { solveNutrientSelection } from '@growlog/web-lib/nutrient/workspace/solve-sync';
import { useEffect, useRef, useState } from 'react';

const WAND_DEBOUNCE_MS = 200;

export function useMobileNutrientSolve(params: NutrientSolveParams): {
  result: SolveForwardResult | null;
  computing: boolean;
} {
  const inputKey = nutrientSolveInputKey(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const debounceImmediateOnceRef = useRef(true);
  const lastSolveKeyRef = useRef<string | null>(null);
  const [result, setResult] = useState<SolveForwardResult | null>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    const apply = () => {
      const p = paramsRef.current;
      const solveKey = nutrientSolveInputKey(p);
      if (lastSolveKeyRef.current === solveKey) {
        setComputing(false);
        return;
      }
      lastSolveKeyRef.current = solveKey;
      const next = solveNutrientSelection({
        ...p,
        substituteCatalogIds: p.selectedProductIds,
      });
      setResult(next);
      setComputing(false);
    };

    if (debounceImmediateOnceRef.current) {
      debounceImmediateOnceRef.current = false;
      apply();
      return;
    }

    setComputing(true);
    const handle = setTimeout(apply, WAND_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputKey]);

  return { result, computing };
}
