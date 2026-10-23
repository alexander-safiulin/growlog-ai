import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { activeCatalogFertilizers } from '@/lib/nutrient/catalog-deprecated';

const HOAGLAND_SOLUBILITY_KEYS = [
  'KNO3',
  'Ca(NO3)2·4H2O',
  'MgSO4·7H2O',
  'KH2PO4',
] as const;

/** Default catalog selection for Hoagland-style macro salt solving. */
export function defaultHoaglandSaltProductIds(bundle: CatalogBundle): string[] {
  const byKey = new Map<string, string>();
  for (const p of activeCatalogFertilizers(bundle.fertilizers)) {
    const key = (p.metadata?.solubility_key as string | undefined)?.trim();
    if (key && HOAGLAND_SOLUBILITY_KEYS.includes(key as typeof HOAGLAND_SOLUBILITY_KEYS[number])) {
      if (!byKey.has(key)) byKey.set(key, p.id);
    }
  }
  const ordered = HOAGLAND_SOLUBILITY_KEYS.map((k) => byKey.get(k)).filter(Boolean) as string[];
  if (ordered.length === HOAGLAND_SOLUBILITY_KEYS.length) return ordered;

  const fallbackLabels = ['KNO3', 'Ca(NO3)2', 'MgSO4', 'KH2PO4', 'калийная селитра', 'кальциевая селитра'];
  const ids: string[] = [];
  for (const label of fallbackLabels) {
    const p = activeCatalogFertilizers(bundle.fertilizers).find(
      (f) =>
        f.external_key.includes('hydrobuddy|') &&
        (f.name.toLowerCase().includes(label.toLowerCase()) ||
          f.external_key.toLowerCase().includes(label.toLowerCase().replace(/[^a-z0-9]/g, ''))),
    );
    if (p && !ids.includes(p.id)) ids.push(p.id);
  }
  return ids.slice(0, 4);
}

const APOTHECARY_MGSO4_EXTERNAL_SUFFIX = 'сульфат магния аптечный 25%';

/**
 * Default nutrient workspace product selection (web/mobile): Hoagland macro salts plus
 * pharmacy-grade 25% magnesium sulfate (common in RU catalogs).
 */
export function defaultNutrientWorkspaceProductIds(bundle: CatalogBundle): string[] {
  const hoagland = defaultHoaglandSaltProductIds(bundle);
  const apothecary = activeCatalogFertilizers(bundle.fertilizers).find((p) =>
    p.external_key.toLowerCase().includes(APOTHECARY_MGSO4_EXTERNAL_SUFFIX),
  );
  if (apothecary && !hoagland.includes(apothecary.id)) {
    return [...hoagland, apothecary.id];
  }
  return hoagland;
}
