/**
 * Idempotent SQL: retain hyphen/legacy catalog rows, re-point user FKs, mark deprecated.
 * Used by pnpm nutrient:build-p5-migration (no DELETE on fertilizer_products).
 */
export function catalogDedupeRetentionSql(): string {
  return `
-- Catalog dedupe: keep legacy external_key rows; re-point user references to canonical products.
-- Idempotent — safe to re-run.

delete from public.farm_nutrient_favorites af
where af.id in (
  select af2.id
  from public.farm_nutrient_favorites af2
  join public.fertilizer_products alias_p on alias_p.id = af2.catalog_product_id
  join public.fertilizer_product_aliases a on a.alias_external_key = alias_p.external_key
  join public.fertilizer_products canon_p on canon_p.external_key = a.canonical_external_key
  join public.farm_nutrient_favorites cf
    on cf.farm_id = af2.farm_id
    and cf.user_id = af2.user_id
    and cf.catalog_product_id = canon_p.id
);

update public.farm_nutrient_favorites AS f
set catalog_product_id = canon_p.id
from public.fertilizer_product_aliases AS a
join public.fertilizer_products AS alias_p on alias_p.external_key = a.alias_external_key
join public.fertilizer_products AS canon_p on canon_p.external_key = a.canonical_external_key
where f.catalog_product_id = alias_p.id;

update public.nutrient_recipe_doses AS d
set fertilizer_product_id = canon_p.id
from public.fertilizer_product_aliases AS a
join public.fertilizer_products AS alias_p on alias_p.external_key = a.alias_external_key
join public.fertilizer_products AS canon_p on canon_p.external_key = a.canonical_external_key
where d.fertilizer_product_id = alias_p.id;

update public.fertilizer_products AS fp
set
  metadata = coalesce(fp.metadata, '{}'::jsonb) || jsonb_build_object(
    'catalog_deprecated', true,
    'canonical_external_key', a.canonical_external_key
  ),
  updated_at = now()
from public.fertilizer_product_aliases AS a
where fp.external_key = a.alias_external_key
  and coalesce((fp.metadata->>'catalog_deprecated')::boolean, false) is distinct from true;
`.trim();
}
