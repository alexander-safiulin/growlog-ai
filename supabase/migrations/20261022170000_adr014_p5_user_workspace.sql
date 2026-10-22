-- ADR-014 P5: farm workspace (favorites, solution kinds, grow timeline links, farm product density)

create type public.nutrient_solution_kind as enum ('recipe', 'stock', 'working');

alter table public.nutrient_recipes
  add column if not exists solution_kind public.nutrient_solution_kind not null default 'recipe',
  add column if not exists feed_schedule_id uuid references public.feed_schedules(id) on delete set null,
  add column if not exists linked_event_id uuid references public.events(id) on delete set null,
  add column if not exists parent_recipe_id uuid references public.nutrient_recipes(id) on delete set null;

create index if not exists nutrient_recipes_farm_solution_kind_idx
  on public.nutrient_recipes (farm_id, solution_kind);

alter table public.farm_fertilizer_products
  add column if not exists density_g_per_ml numeric,
  add column if not exists label_basis text check (label_basis is null or label_basis in ('w_w', 'w_v'));

create table public.farm_nutrient_favorites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_scope text not null check (product_scope in ('catalog', 'farm')),
  catalog_product_id uuid references public.fertilizer_products(id) on delete cascade,
  farm_product_id uuid references public.farm_fertilizer_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint farm_nutrient_favorites_product_ref check (
    (product_scope = 'catalog' and catalog_product_id is not null and farm_product_id is null)
    or (product_scope = 'farm' and farm_product_id is not null and catalog_product_id is null)
  )
);

create unique index farm_nutrient_favorites_catalog_uidx
  on public.farm_nutrient_favorites (farm_id, user_id, catalog_product_id)
  where catalog_product_id is not null;

create unique index farm_nutrient_favorites_farm_uidx
  on public.farm_nutrient_favorites (farm_id, user_id, farm_product_id)
  where farm_product_id is not null;

create index farm_nutrient_favorites_farm_user_idx
  on public.farm_nutrient_favorites (farm_id, user_id);

alter table public.farm_nutrient_favorites enable row level security;

create policy farm_nutrient_favorites_select on public.farm_nutrient_favorites
  for select to authenticated
  using (
    farm_id in (select public.user_farm_ids())
    and user_id = auth.uid()
  );

create policy farm_nutrient_favorites_write on public.farm_nutrient_favorites
  for all to authenticated
  using (
    farm_id in (select public.user_farm_ids())
    and user_id = auth.uid()
    and public.user_can_manage_farm_nutrient(farm_id)
  )
  with check (
    farm_id in (select public.user_farm_ids())
    and user_id = auth.uid()
    and public.user_can_manage_farm_nutrient(farm_id)
  );

grant select, insert, update, delete on public.farm_nutrient_favorites to authenticated;
