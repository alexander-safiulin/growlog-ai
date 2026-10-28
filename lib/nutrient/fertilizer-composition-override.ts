/** Farm row that replaces one catalog product's composition. The catalog row stays read-only. */
export const OVERRIDES_CATALOG_PRODUCT_ID = 'overrides_catalog_product_id';

export const COMPOSITION_EDITED = 'composition_edited';

export type CompositionPctLine = {
  form_key: string;
  value_pct: number;
  n_form?: string | null;
};

export function catalogOverrideExternalKey(catalogProductId: string): string {
  return `catalog-override:${catalogProductId}`;
}

export function catalogOverrideTargetId(metadata: Record<string, unknown> | null | undefined): string | null {
  const id = metadata?.[OVERRIDES_CATALOG_PRODUCT_ID];
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function isCompositionEdited(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.[COMPOSITION_EDITED] === true;
}

export function compositionLinesEqual(a: CompositionPctLine[], b: CompositionPctLine[]): boolean {
  const norm = (lines: CompositionPctLine[]) => {
    const totals = new Map<string, number>();
    for (const line of lines) {
      const key = line.form_key.trim();
      if (!key || !Number.isFinite(line.value_pct) || line.value_pct <= 0) continue;
      totals.set(key, (totals.get(key) ?? 0) + line.value_pct);
    }
    return [...totals.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  };
  const left = norm(a);
  const right = norm(b);
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry[0] === right[index]?.[0] && Math.abs(entry[1] - (right[index]?.[1] ?? 0)) < 1e-6);
}

export function splitFarmCompositionOverrides<T extends { metadata?: Record<string, unknown> | null }>(
  farmProducts: T[],
): { overrides: Map<string, T>; own: T[] } {
  const overrides = new Map<string, T>();
  const own: T[] = [];
  for (const product of farmProducts) {
    const catalogId = catalogOverrideTargetId(product.metadata);
    if (catalogId) overrides.set(catalogId, product);
    else own.push(product);
  }
  return { overrides, own };
}

export function parseCompositionPct(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function compositionLinesFromDraft(
  pct: Record<string, string>,
  original: CompositionPctLine[],
): CompositionPctLine[] {
  const nForm = new Map(original.map((line) => [line.form_key, line.n_form ?? null]));
  const keys = new Set([...Object.keys(pct), ...original.map((line) => line.form_key)]);
  const lines: CompositionPctLine[] = [];
  for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
    const value = parseCompositionPct(pct[key] ?? '');
    if (value == null) continue;
    lines.push({ form_key: key, value_pct: value, n_form: nForm.get(key) ?? null });
  }
  return lines;
}
