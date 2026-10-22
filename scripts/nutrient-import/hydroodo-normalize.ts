export function externalKey(brand: string, name: string): string {
  return `${brand.trim()}|${name.trim()}`.toLowerCase();
}

const ALIAS_TO_CANONICAL: Record<string, string> = {
  [externalKey('Буйские Удобрения', 'Селитра Кальциевая')]: externalKey(
    'Буйские Удобрения',
    'Кальциевая селитра',
  ),
  [externalKey('Буйские Удобрения', 'Калий сернокислый (сульфат калия)')]: externalKey(
    'Буйские Удобрения',
    'Сульфат Калия',
  ),
};

export interface HydroComponent {
  brand: string;
  name: string;
  declared_pct: Record<string, number>;
}

export interface NormalizedProduct {
  brand: string;
  name: string;
  external_key: string;
  declared_pct: Record<string, number>;
  metadata: Record<string, unknown>;
  skipped_as_alias?: boolean;
  alias_of?: string;
}

export function detectNTotalIncludesForms(declared: Record<string, number>): boolean {
  const totalN = declared.N ?? 0;
  if (totalN <= 0) return false;
  return (declared.NO3 ?? 0) > 0 || (declared.NH4 ?? 0) > 0 || (declared.NH2 ?? 0) > 0;
}

function applyProductCorrections(
  brand: string,
  name: string,
  declared: Record<string, number>,
): { declared: Record<string, number>; metadata: Record<string, unknown> } {
  const metadata: Record<string, unknown> = {};
  const out = { ...declared };

  const key = externalKey(brand, name);

  if (key === externalKey('Буйские Удобрения', 'Сульфат Калия')) {
    if (out.K2O != null && (out.S ?? 0) < 1) {
      out.S = 18;
      metadata.corrected_from_hydroodo = {
        field: 'S',
        reason: 'K2SO4 typical sulfur ~18% w/w; Hydroodo listed K2O only',
      };
    }
  }

  if (key === externalKey('Буйские Удобрения', 'Кальциевая селитра')) {
    if ((out.N ?? 0) > 0 && (out.NO3 ?? 0) === 0) {
      out.NO3 = out.N;
      delete out.N;
      metadata.corrected_from_hydroodo = {
        field: 'N→NO3',
        reason: 'Calcium nitrate nitrogen reported as nitrate on label; Hydroodo duplicate used total N',
      };
    }
  }

  if (detectNTotalIncludesForms(out)) {
    metadata.n_total_includes_forms = true;
  }

  return { declared: out, metadata };
}

export function normalizeHydroodoComponents(components: HydroComponent[]): {
  products: NormalizedProduct[];
  aliases: Array<{ alias_external_key: string; canonical_external_key: string; notes: Record<string, unknown> }>;
} {
  const aliases: Array<{
    alias_external_key: string;
    canonical_external_key: string;
    notes: Record<string, unknown>;
  }> = [];
  const products: NormalizedProduct[] = [];
  const seenCanonical = new Set<string>();

  for (const c of components) {
    const rawKey = externalKey(c.brand, c.name);
    const canonicalKey = ALIAS_TO_CANONICAL[rawKey] ?? rawKey;

    if (canonicalKey !== rawKey) {
      aliases.push({
        alias_external_key: rawKey,
        canonical_external_key: canonicalKey,
        notes: { merged_from_hydroodo_name: c.name },
      });
      continue;
    }

    if (seenCanonical.has(canonicalKey)) continue;
    seenCanonical.add(canonicalKey);

    const corrected = applyProductCorrections(c.brand, c.name, c.declared_pct);
    products.push({
      brand: c.brand,
      name: c.name,
      external_key: canonicalKey,
      declared_pct: corrected.declared,
      metadata: corrected.metadata,
    });
  }

  return { products, aliases };
}

export function hydroodoSystemSlug(name: string, index: number): string {
  const lower = name.toLowerCase();
  let tag = `sys-${String(index + 1).padStart(2, '0')}`;
  if (lower.includes('вегетация') || lower.includes('vegetative')) tag = 'veg';
  else if (lower.includes('цветение') || lower.includes('bloom') || lower.includes('flower')) tag = 'bloom';
  else if (lower.includes('рассада') || lower.includes('seedling')) tag = 'seedling';

  const base = name
    .toLowerCase()
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `hydroodo-${base}-${tag}`.replace(/-+/g, '-').slice(0, 96);
}
