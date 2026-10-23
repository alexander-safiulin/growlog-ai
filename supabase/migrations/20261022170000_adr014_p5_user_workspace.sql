-- ADR-014 P5: farm workspace (idempotent — safe to apply twice on PG17)

-- ─── Enum ────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.nutrient_solution_kind as enum ('recipe', 'stock', 'working');
exception
  when duplicate_object then null;
end $$;

-- ─── nutrient_recipes extensions ─────────────────────────────────────────────
alter table public.nutrient_recipes
  add column if not exists solution_kind public.nutrient_solution_kind not null default 'recipe',
  add column if not exists feed_schedule_id uuid references public.feed_schedules(id) on delete set null,
  add column if not exists linked_event_id uuid references public.events(id) on delete set null,
  add column if not exists parent_recipe_id uuid references public.nutrient_recipes(id) on delete set null,
  add column if not exists farm_feed_system_id uuid,
  add column if not exists farm_feed_system_step_id uuid;

create index if not exists nutrient_recipes_farm_solution_kind_idx
  on public.nutrient_recipes (farm_id, solution_kind);

-- ─── Farm fertilizer product fields ──────────────────────────────────────────
alter table public.farm_fertilizer_products
  add column if not exists density_g_per_ml numeric,
  add column if not exists label_basis text;

do $$ begin
  alter table public.farm_fertilizer_products
    add constraint farm_fertilizer_products_label_basis_check
    check (label_basis is null or label_basis in ('w_w', 'w_v'));
exception
  when duplicate_object then null;
end $$;

alter table public.farm_fertilizer_composition_lines
  add column if not exists n_form text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.farm_fertilizer_composition_lines
    add constraint farm_fertilizer_composition_lines_n_form_check
    check (n_form is null or n_form in ('nitrate', 'ammonium', 'urea', 'amide', 'total'));
exception
  when duplicate_object then null;
end $$;

-- ─── Farm water profile extras (ions + EC/pH in metadata) ───────────────────
alter table public.farm_water_profiles
  add column if not exists ec_ms_cm numeric,
  add column if not exists ph numeric;

-- ─── User feed systems (farm-scoped) ─────────────────────────────────────────
create table if not exists public.farm_feed_systems (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table if not exists public.farm_feed_system_steps (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.farm_feed_systems(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  step_order int not null,
  week_label text,
  stage text,
  target_ppm jsonb not null default '{}'::jsonb,
  ph_target numeric,
  ec_target_ms_cm numeric,
  light_hours numeric,
  light_ppfd numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, step_order)
);

create index if not exists farm_feed_system_steps_farm_idx on public.farm_feed_system_steps (farm_id);

-- ─── Grow cycle ↔ feed system attachment ───────────────────────────────────
create table if not exists public.grow_cycle_nutrient_plans (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid not null references public.grow_cycles(id) on delete cascade,
  farm_feed_system_id uuid not null references public.farm_feed_systems(id) on delete cascade,
  active_step_id uuid references public.farm_feed_system_steps(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id)
);

-- Deferred FKs on nutrient_recipes (tables must exist)
do $$ begin
  alter table public.nutrient_recipes
    add constraint nutrient_recipes_farm_feed_system_id_fkey
    foreign key (farm_feed_system_id) references public.farm_feed_systems(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.nutrient_recipes
    add constraint nutrient_recipes_farm_feed_system_step_id_fkey
    foreign key (farm_feed_system_step_id) references public.farm_feed_system_steps(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- ─── Favorites ─────────────────────────────────────────────────────────────
create table if not exists public.farm_nutrient_favorites (
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

create unique index if not exists farm_nutrient_favorites_catalog_uidx
  on public.farm_nutrient_favorites (farm_id, user_id, catalog_product_id)
  where catalog_product_id is not null;

create unique index if not exists farm_nutrient_favorites_farm_uidx
  on public.farm_nutrient_favorites (farm_id, user_id, farm_product_id)
  where farm_product_id is not null;

create index if not exists farm_nutrient_favorites_farm_user_idx
  on public.farm_nutrient_favorites (farm_id, user_id);

-- ─── Cross-farm reference guards ─────────────────────────────────────────────
create or replace function public.nutrient_guard_farm_nutrient_favorites()
returns trigger
language plpgsql
as $$
begin
  if new.farm_product_id is not null then
    if not exists (
      select 1 from public.farm_fertilizer_products p
      where p.id = new.farm_product_id and p.farm_id = new.farm_id
    ) then
      raise exception 'farm_nutrient_favorites: farm_product_id must belong to farm_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists farm_nutrient_favorites_guard on public.farm_nutrient_favorites;
create trigger farm_nutrient_favorites_guard
  before insert or update on public.farm_nutrient_favorites
  for each row execute function public.nutrient_guard_farm_nutrient_favorites();

create or replace function public.nutrient_guard_nutrient_recipe_farm_refs()
returns trigger
language plpgsql
as $$
begin
  if new.cycle_id is not null then
    if not exists (
      select 1 from public.grow_cycles c where c.id = new.cycle_id and c.farm_id = new.farm_id
    ) then
      raise exception 'nutrient_recipes: cycle_id must belong to farm_id';
    end if;
  end if;
  if new.scope_id is not null then
    if not exists (
      select 1 from public.scopes s where s.id = new.scope_id and s.farm_id = new.farm_id
    ) then
      raise exception 'nutrient_recipes: scope_id must belong to farm_id';
    end if;
  end if;
  if new.parent_recipe_id is not null then
    if not exists (
      select 1 from public.nutrient_recipes r
      where r.id = new.parent_recipe_id and r.farm_id = new.farm_id
    ) then
      raise exception 'nutrient_recipes: parent_recipe_id must belong to farm_id';
    end if;
  end if;
  if new.linked_event_id is not null then
    if not exists (
      select 1 from public.events e where e.id = new.linked_event_id and e.farm_id = new.farm_id
    ) then
      raise exception 'nutrient_recipes: linked_event_id must belong to farm_id';
    end if;
  end if;
  if new.farm_feed_system_id is not null then
    if not exists (
      select 1 from public.farm_feed_systems s where s.id = new.farm_feed_system_id and s.farm_id = new.farm_id
    ) then
      raise exception 'nutrient_recipes: farm_feed_system_id must belong to farm_id';
    end if;
  end if;
  if new.farm_feed_system_step_id is not null then
    if not exists (
      select 1 from public.farm_feed_system_steps st
      where st.id = new.farm_feed_system_step_id and st.farm_id = new.farm_id
    ) then
      raise exception 'nutrient_recipes: farm_feed_system_step_id must belong to farm_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists nutrient_recipes_guard_farm_refs on public.nutrient_recipes;
create trigger nutrient_recipes_guard_farm_refs
  before insert or update on public.nutrient_recipes
  for each row execute function public.nutrient_guard_nutrient_recipe_farm_refs();

create or replace function public.nutrient_guard_feed_system_step_farm()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.farm_feed_systems s
    where s.id = new.system_id and s.farm_id = new.farm_id
  ) then
    raise exception 'farm_feed_system_steps: system_id must match farm_id';
  end if;
  return new;
end;
$$;

drop trigger if exists farm_feed_system_steps_guard on public.farm_feed_system_steps;
create trigger farm_feed_system_steps_guard
  before insert or update on public.farm_feed_system_steps
  for each row execute function public.nutrient_guard_feed_system_step_farm();

create or replace function public.nutrient_guard_grow_cycle_nutrient_plan()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.grow_cycles c where c.id = new.cycle_id and c.farm_id = new.farm_id
  ) then
    raise exception 'grow_cycle_nutrient_plans: cycle_id must belong to farm_id';
  end if;
  if not exists (
    select 1 from public.farm_feed_systems s where s.id = new.farm_feed_system_id and s.farm_id = new.farm_id
  ) then
    raise exception 'grow_cycle_nutrient_plans: farm_feed_system_id must belong to farm_id';
  end if;
  if new.active_step_id is not null then
    if not exists (
      select 1 from public.farm_feed_system_steps st
      where st.id = new.active_step_id and st.farm_id = new.farm_id and st.system_id = new.farm_feed_system_id
    ) then
      raise exception 'grow_cycle_nutrient_plans: active_step_id invalid for system/farm';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists grow_cycle_nutrient_plans_guard on public.grow_cycle_nutrient_plans;
create trigger grow_cycle_nutrient_plans_guard
  before insert or update on public.grow_cycle_nutrient_plans
  for each row execute function public.nutrient_guard_grow_cycle_nutrient_plan();

-- ─── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists farm_feed_systems_updated_at on public.farm_feed_systems;
create trigger farm_feed_systems_updated_at before update on public.farm_feed_systems
  for each row execute function public.set_updated_at();

drop trigger if exists farm_feed_system_steps_updated_at on public.farm_feed_system_steps;
create trigger farm_feed_system_steps_updated_at before update on public.farm_feed_system_steps
  for each row execute function public.set_updated_at();

drop trigger if exists grow_cycle_nutrient_plans_updated_at on public.grow_cycle_nutrient_plans;
create trigger grow_cycle_nutrient_plans_updated_at before update on public.grow_cycle_nutrient_plans
  for each row execute function public.set_updated_at();

-- ─── RLS: new tables ─────────────────────────────────────────────────────────
alter table public.farm_feed_systems enable row level security;
alter table public.farm_feed_system_steps enable row level security;
alter table public.grow_cycle_nutrient_plans enable row level security;
alter table public.farm_nutrient_favorites enable row level security;

drop policy if exists farm_feed_systems_select on public.farm_feed_systems;
create policy farm_feed_systems_select on public.farm_feed_systems
  for select to authenticated using (farm_id in (select public.user_farm_ids()));

drop policy if exists farm_feed_systems_write on public.farm_feed_systems;
create policy farm_feed_systems_write on public.farm_feed_systems
  for all to authenticated
  using (public.user_can_manage_farm_nutrient(farm_id))
  with check (public.user_can_manage_farm_nutrient(farm_id));

drop policy if exists farm_feed_system_steps_select on public.farm_feed_system_steps;
create policy farm_feed_system_steps_select on public.farm_feed_system_steps
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()));

drop policy if exists farm_feed_system_steps_write on public.farm_feed_system_steps;
create policy farm_feed_system_steps_write on public.farm_feed_system_steps
  for all to authenticated
  using (public.user_can_manage_farm_nutrient(farm_id))
  with check (public.user_can_manage_farm_nutrient(farm_id));

drop policy if exists grow_cycle_nutrient_plans_select on public.grow_cycle_nutrient_plans;
create policy grow_cycle_nutrient_plans_select on public.grow_cycle_nutrient_plans
  for select to authenticated using (farm_id in (select public.user_farm_ids()));

drop policy if exists grow_cycle_nutrient_plans_write on public.grow_cycle_nutrient_plans;
create policy grow_cycle_nutrient_plans_write on public.grow_cycle_nutrient_plans
  for all to authenticated
  using (public.user_can_manage_farm_nutrient(farm_id))
  with check (public.user_can_manage_farm_nutrient(farm_id));

drop policy if exists farm_nutrient_favorites_select on public.farm_nutrient_favorites;
create policy farm_nutrient_favorites_select on public.farm_nutrient_favorites
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()) and user_id = auth.uid());

drop policy if exists farm_nutrient_favorites_write on public.farm_nutrient_favorites;
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

grant select, insert, update, delete on public.farm_feed_systems to authenticated;
grant select, insert, update, delete on public.farm_feed_system_steps to authenticated;
grant select, insert, update, delete on public.grow_cycle_nutrient_plans to authenticated;
grant select, insert, update, delete on public.farm_nutrient_favorites to authenticated;
