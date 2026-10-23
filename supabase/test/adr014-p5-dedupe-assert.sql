-- After P5 migration: legacy hyphen row retained; favorites/doses point at canonical product.
do $assert$
declare
  alias_id uuid;
  canon_id uuid;
  fav_id uuid;
  dose_prod uuid;
  deprecated boolean;
begin
  select id into alias_id from public.fertilizer_products where external_key = 'plagron|hydro-a';
  if alias_id is null then
    raise exception 'expected legacy product plagron|hydro-a to exist';
  end if;

  select id into canon_id from public.fertilizer_products where external_key = 'plagron|hydro a';
  if canon_id is null then
    raise exception 'expected canonical product plagron|hydro a to exist';
  end if;

  select coalesce((metadata->>'catalog_deprecated')::boolean, false)
  into deprecated
  from public.fertilizer_products
  where id = alias_id;
  if not deprecated then
    raise exception 'expected plagron|hydro-a metadata.catalog_deprecated = true';
  end if;

  select catalog_product_id into fav_id
  from public.farm_nutrient_favorites
  where farm_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  limit 1;
  if fav_id is distinct from canon_id then
    raise exception 'favorite should reference canonical product id, got % expected %', fav_id, canon_id;
  end if;

  select fertilizer_product_id into dose_prod
  from public.nutrient_recipe_doses
  where recipe_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
  limit 1;
  if dose_prod is distinct from canon_id then
    raise exception 'recipe dose should reference canonical product id, got % expected %', dose_prod, canon_id;
  end if;
end $assert$;
