import { useMemo } from 'react';
import {
  mapDbProfileToTarget,
  solveMagicWand,
  type SolveForwardResult,
  type TargetPpm,
} from '@growlog/nutrient-calc';
import type { CatalogBundle } from '../catalog-types';
import { sourceWaterFromProfile, type FullWaterProfileInput } from '../water-profile-solver';
import { unifiedToFertilizerSpecs, type UnifiedProduct } from '../unified-products';
import type { FarmFeedSystemStepRow } from '@growlog/domain';

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

export function useNutrientSolve(params: NutrientSolveParams): SolveForwardResult | null {
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

  return useMemo(() => {
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

    try {
      return solveMagicWand({
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
          maxAlternatives: 8,
          fastSolver: false,
        },
      });
    } catch {
      return null;
    }
  }, [
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
  ]);
}
