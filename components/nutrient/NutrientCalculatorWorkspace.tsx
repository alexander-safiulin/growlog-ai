'use client';

import { NutrientCalculatorApp } from '@/components/nutrient/NutrientCalculatorApp';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';

export function NutrientCalculatorWorkspace({ catalog }: { catalog: CatalogBundle }) {
  return <NutrientCalculatorApp catalog={catalog} />;
}
