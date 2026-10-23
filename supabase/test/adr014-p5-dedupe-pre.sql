-- Seed user data pointing at a legacy hyphen catalog key before P5 catalog dedupe SQL runs.
insert into auth.users (id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)
on conflict (id) do nothing;

insert into public.farms (id, name, timezone)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'Dedupe test farm', 'UTC')
on conflict (id) do nothing;

insert into public.farm_users (farm_id, user_id, role)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'admin'
)
on conflict do nothing;

insert into public.farm_nutrient_favorites (
  farm_id, user_id, product_scope, catalog_product_id
)
select
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'catalog',
  p.id
from public.fertilizer_products p
where p.external_key = 'plagron|hydro-a'
  and not exists (
    select 1 from public.farm_nutrient_favorites f
    where f.farm_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      and f.user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and f.catalog_product_id = p.id
  );

insert into public.nutrient_recipes (
  id, farm_id, name, volume_l, mode, inputs, result, solver_version, created_by
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'Dedupe dose test',
  10,
  'reverse',
  '{}'::jsonb,
  '{}'::jsonb,
  'test',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
)
on conflict (id) do nothing;

insert into public.nutrient_recipe_doses (
  recipe_id, fertilizer_product_id, fertilizer_label, dose_per_l, unit, tank
)
select
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
  p.id,
  'Plagron Hydro A (legacy key)',
  2.5,
  'ml_per_L'::public.nutrient_dose_unit,
  'single'
from public.fertilizer_products p
where p.external_key = 'plagron|hydro-a'
  and not exists (
    select 1 from public.nutrient_recipe_doses d
    where d.recipe_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
  );
