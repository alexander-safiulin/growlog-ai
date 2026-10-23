import type { CatalogBundle } from '@growlog/web-lib/nutrient/catalog-types';
import bundle from '../../../supabase/seed/nutrient/adr014-catalog.bundle.json';

export const nutrientCatalog = bundle as unknown as CatalogBundle;
