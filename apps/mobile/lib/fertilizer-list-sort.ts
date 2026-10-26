import { declaredToElemental } from '@growlog/nutrient-calc';
import { productDisplayName } from '@growlog/web-lib/nutrient/product-display-names';

export const FERTILIZER_SORT_MACROS = ['N', 'P', 'K', 'Ca'] as const;
export type FertilizerSortKey = 'name' | (typeof FERTILIZER_SORT_MACROS)[number];

export type FertilizerSortRow = {
  brand: string;
  external_key: string;
  name: string;
  lines: Array<{ form_key: string; value_pct: number }>;
};

export function macroPercents(
  lines: Array<{ form_key: string; value_pct: number }>,
): Record<(typeof FERTILIZER_SORT_MACROS)[number], number> {
  const declared: Record<string, number> = {};
  for (const line of lines) {
    declared[line.form_key] = (declared[line.form_key] ?? 0) + line.value_pct;
  }
  const { pct } = declaredToElemental(declared);
  const nitrogen =
    (pct.N ?? 0) > 0
      ? (pct.N ?? 0)
      : (pct.N_NO3 ?? 0) + (pct.N_NH4 ?? 0) + (pct.N_UREA ?? 0) + (pct.N_UNKNOWN ?? 0);
  return { N: nitrogen, P: pct.P ?? 0, K: pct.K ?? 0, Ca: pct.Ca ?? 0 };
}

function fertilizerListLabel(p: FertilizerSortRow, locale: string): string {
  const clean = p.name.replace(/[★☆✱☑☐✓✔●○▸▾]/g, '').replace(/\s+/g, ' ').trim();
  const brandClean = p.brand.replace(/[★☆✱☑☐✓✔●○▸▾]/g, '').replace(/\s+/g, ' ').trim();
  const name = productDisplayName(p.external_key, clean, locale === 'ru' ? 'ru' : 'en');
  const label =
    !brandClean || brandClean.toLowerCase() === name.toLowerCase() ? name : `${brandClean} · ${name}`;
  return label.toLowerCase();
}

export function compareFertilizers(
  a: FertilizerSortRow,
  b: FertilizerSortRow,
  sortKey: FertilizerSortKey,
  sortDir: 'asc' | 'desc',
  locale: string,
): number {
  const dir = sortDir === 'asc' ? 1 : -1;
  if (sortKey === 'name') {
    return fertilizerListLabel(a, locale).localeCompare(fertilizerListLabel(b, locale), locale) * dir;
  }
  const ma = macroPercents(a.lines)[sortKey];
  const mb = macroPercents(b.lines)[sortKey];
  if (ma !== mb) return (ma - mb) * dir;
  return fertilizerListLabel(a, locale).localeCompare(fertilizerListLabel(b, locale), locale);
}

export function sortFertilizerRows<T extends FertilizerSortRow>(
  rows: T[],
  sortKey: FertilizerSortKey,
  sortDir: 'asc' | 'desc',
  locale: string,
): T[] {
  const list = [...rows];
  list.sort((a, b) => compareFertilizers(a, b, sortKey, sortDir, locale));
  return list;
}
