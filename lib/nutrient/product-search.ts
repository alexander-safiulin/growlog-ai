import type { UnifiedProduct } from './unified-products';
import { productDisplayName } from './product-display-names';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function productMatchesSearch(
  product: UnifiedProduct,
  query: string,
  locale: 'en' | 'ru',
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const display = productDisplayName(product.external_key, product.name, locale, {
    preserveFallback: product.scope === 'farm',
  });
  const haystack = normalizeSearchText(
    [product.brand, product.name, product.external_key, display].join(' '),
  );
  return haystack.includes(q);
}
