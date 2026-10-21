-- ADR-014: Nutrient calculator catalog + farm-scoped recipes (P2)
-- Global catalog: public read (anon + authenticated). Farm rows: member read; admin/manager write.

create type public.nutrient_trust_level as enum (
  'high',
  'medium',
  'low',
  'unverified'
);

create type public.nutrient_verification_status as enum (
  'verified',
  'spot_checked',
  'unverified',
  'known_error'
);

create type public.nutrient_physical_form as enum ('solid', 'liquid');

create type public.nutrient_dose_unit as enum ('g_per_L', 'ml_per_L');

-- ─── Provenance registry ─────────────────────────────────────────────────────

create table public.nutrient_data_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_type text not null default 'reference',
  citation text,
  url text,
  license text,
  retrieved_at timestamptz not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  trust_level public.nutrient_trust_level not null default 'medium',
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrient_elements (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  display_name text,
  atomic_mass numeric,
  valence smallint,
  element_group text,
  default_overdose_pct numeric,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrient_oxide_factors (
  id uuid primary key default gen_random_uuid(),
  form_key text not null,
  element_symbol text not null,
  factor numeric not null,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_key, element_symbol, source_id)
);

create table public.fertilizer_product_aliases (
  id uuid primary key default gen_random_uuid(),
  alias_external_key text not null unique,
  canonical_external_key text not null,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fertilizer_product_aliases_canonical_idx
  on public.fertilizer_product_aliases (canonical_external_key);

create table public.fertilizer_products (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  brand text not null,
  name text not null,
  physical_form public.nutrient_physical_form not null default 'solid',
  dose_unit public.nutrient_dose_unit not null default 'g_per_L',
  density_g_per_ml numeric,
  label_basis text,
  is_custom boolean not null default false,
  farm_id uuid references public.farms(id) on delete cascade,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fertilizer_products_custom_farm check (
    (is_custom = false and farm_id is null) or (is_custom = true and farm_id is not null)
  )
);

create index fertilizer_products_brand_name_idx on public.fertilizer_products (brand, name);
create index fertilizer_products_farm_id_idx on public.fertilizer_products (farm_id) where farm_id is not null;

create table public.fertilizer_composition_lines (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.fertilizer_products(id) on delete cascade,
  form_key text not null,
  value_pct numeric not null,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, form_key)
);

create table public.target_solution_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  stage text,
  target_ppm jsonb not null default '{}'::jsonb,
  overdose_pct jsonb not null default '{}'::jsonb,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  citation text,
  url text,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrient_catalog_recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  target_profile_id uuid references public.target_solution_profiles(id) on delete set null,
  profile_slug text not null,
  citation text,
  url text,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'spot_checked',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrient_catalog_recipe_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.nutrient_catalog_recipes(id) on delete cascade,
  line_order int not null,
  ingredient_label text not null,
  dose_per_l numeric not null,
  unit public.nutrient_dose_unit not null default 'g_per_L',
  declared_pct jsonb not null default '{}'::jsonb,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, line_order)
);

create table public.feed_schedules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  manufacturer text,
  profile_id uuid references public.target_solution_profiles(id) on delete set null,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  verification_status public.nutrient_verification_status not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feed_schedule_steps (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.feed_schedules(id) on delete cascade,
  step_order int not null,
  label text,
  profile_id uuid references public.target_solution_profiles(id) on delete set null,
  notes text,
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, step_order)
);

create table public.nutrient_incompatibility_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  description text not null,
  form_keys_a text[] not null default '{}',
  form_keys_b text[] not null default '{}',
  severity text not null default 'hard',
  source_id uuid not null references public.nutrient_data_sources(id) on delete restrict,
  license text,
  retrieved_at timestamptz not null,
  trust_level public.nutrient_trust_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Farm-scoped ─────────────────────────────────────────────────────────────

create table public.farm_water_profiles (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  water_ppm jsonb not null default '{}'::jsonb,
  alkalinity_hco3_ppm numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table public.farm_fertilizer_products (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  external_key text not null,
  brand text not null,
  name text not null,
  physical_form public.nutrient_physical_form not null default 'solid',
  dose_unit public.nutrient_dose_unit not null default 'g_per_L',
  source_type text not null default 'user_entered',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, external_key)
);

create table public.farm_fertilizer_composition_lines (
  id uuid primary key default gen_random_uuid(),
  farm_product_id uuid not null references public.farm_fertilizer_products(id) on delete cascade,
  form_key text not null,
  value_pct numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_product_id, form_key)
);

create table public.nutrient_recipes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid references public.grow_cycles(id) on delete set null,
  scope_id uuid references public.scopes(id) on delete set null,
  target_profile_id uuid references public.target_solution_profiles(id) on delete set null,
  name text,
  volume_l numeric,
  mode text not null check (mode in ('forward', 'reverse')),
  inputs jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  solver_version text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrient_recipe_doses (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.nutrient_recipes(id) on delete cascade,
  fertilizer_product_id uuid references public.fertilizer_products(id) on delete set null,
  farm_fertilizer_product_id uuid references public.farm_fertilizer_products(id) on delete set null,
  fertilizer_label text not null,
  dose_per_l numeric not null,
  unit public.nutrient_dose_unit not null,
  tank text not null default 'single' check (tank in ('single', 'a', 'b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

create trigger nutrient_data_sources_updated_at before update on public.nutrient_data_sources
  for each row execute function public.set_updated_at();
create trigger nutrient_elements_updated_at before update on public.nutrient_elements
  for each row execute function public.set_updated_at();
create trigger nutrient_oxide_factors_updated_at before update on public.nutrient_oxide_factors
  for each row execute function public.set_updated_at();
create trigger fertilizer_product_aliases_updated_at before update on public.fertilizer_product_aliases
  for each row execute function public.set_updated_at();
create trigger nutrient_catalog_recipes_updated_at before update on public.nutrient_catalog_recipes
  for each row execute function public.set_updated_at();
create trigger nutrient_catalog_recipe_lines_updated_at before update on public.nutrient_catalog_recipe_lines
  for each row execute function public.set_updated_at();
create trigger fertilizer_products_updated_at before update on public.fertilizer_products
  for each row execute function public.set_updated_at();
create trigger fertilizer_composition_lines_updated_at before update on public.fertilizer_composition_lines
  for each row execute function public.set_updated_at();
create trigger target_solution_profiles_updated_at before update on public.target_solution_profiles
  for each row execute function public.set_updated_at();
create trigger feed_schedules_updated_at before update on public.feed_schedules
  for each row execute function public.set_updated_at();
create trigger feed_schedule_steps_updated_at before update on public.feed_schedule_steps
  for each row execute function public.set_updated_at();
create trigger nutrient_incompatibility_rules_updated_at before update on public.nutrient_incompatibility_rules
  for each row execute function public.set_updated_at();
create trigger farm_water_profiles_updated_at before update on public.farm_water_profiles
  for each row execute function public.set_updated_at();
create trigger farm_fertilizer_products_updated_at before update on public.farm_fertilizer_products
  for each row execute function public.set_updated_at();
create trigger farm_fertilizer_composition_lines_updated_at before update on public.farm_fertilizer_composition_lines
  for each row execute function public.set_updated_at();
create trigger nutrient_recipes_updated_at before update on public.nutrient_recipes
  for each row execute function public.set_updated_at();
create trigger nutrient_recipe_doses_updated_at before update on public.nutrient_recipe_doses
  for each row execute function public.set_updated_at();

-- ─── RLS helpers ─────────────────────────────────────────────────────────────

create or replace function public.user_can_manage_farm_nutrient(p_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_farm_role(p_farm_id) in ('admin', 'manager');
$$;

grant execute on function public.user_can_manage_farm_nutrient(uuid) to authenticated, service_role;

-- ─── RLS: global catalog (public read, no client writes) ─────────────────────

alter table public.nutrient_data_sources enable row level security;
alter table public.nutrient_elements enable row level security;
alter table public.nutrient_oxide_factors enable row level security;
alter table public.fertilizer_products enable row level security;
alter table public.fertilizer_composition_lines enable row level security;
alter table public.target_solution_profiles enable row level security;
alter table public.feed_schedules enable row level security;
alter table public.feed_schedule_steps enable row level security;
alter table public.fertilizer_product_aliases enable row level security;
alter table public.nutrient_catalog_recipes enable row level security;
alter table public.nutrient_catalog_recipe_lines enable row level security;
alter table public.nutrient_incompatibility_rules enable row level security;

create policy nutrient_data_sources_public_select on public.nutrient_data_sources
  for select to anon, authenticated using (true);

create policy nutrient_elements_public_select on public.nutrient_elements
  for select to anon, authenticated using (true);

create policy nutrient_oxide_factors_public_select on public.nutrient_oxide_factors
  for select to anon, authenticated using (true);

create policy fertilizer_products_public_select on public.fertilizer_products
  for select to anon, authenticated using (is_custom = false);

create policy fertilizer_composition_lines_public_select on public.fertilizer_composition_lines
  for select to anon, authenticated using (
    exists (
      select 1 from public.fertilizer_products p
      where p.id = product_id and p.is_custom = false
    )
  );

create policy target_solution_profiles_public_select on public.target_solution_profiles
  for select to anon, authenticated using (true);

create policy feed_schedules_public_select on public.feed_schedules
  for select to anon, authenticated using (true);

create policy feed_schedule_steps_public_select on public.feed_schedule_steps
  for select to anon, authenticated using (true);

create policy fertilizer_product_aliases_public_select on public.fertilizer_product_aliases
  for select to anon, authenticated using (true);

create policy nutrient_catalog_recipes_public_select on public.nutrient_catalog_recipes
  for select to anon, authenticated using (true);

create policy nutrient_catalog_recipe_lines_public_select on public.nutrient_catalog_recipe_lines
  for select to anon, authenticated using (true);

create policy nutrient_incompatibility_rules_public_select on public.nutrient_incompatibility_rules
  for select to anon, authenticated using (true);

-- ─── RLS: farm tables ────────────────────────────────────────────────────────

alter table public.farm_water_profiles enable row level security;
alter table public.farm_fertilizer_products enable row level security;
alter table public.farm_fertilizer_composition_lines enable row level security;
alter table public.nutrient_recipes enable row level security;
alter table public.nutrient_recipe_doses enable row level security;

create policy farm_water_profiles_select on public.farm_water_profiles
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()));

create policy farm_water_profiles_write on public.farm_water_profiles
  for all to authenticated
  using (public.user_can_manage_farm_nutrient(farm_id))
  with check (public.user_can_manage_farm_nutrient(farm_id));

create policy farm_fertilizer_products_select on public.farm_fertilizer_products
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()));

create policy farm_fertilizer_products_write on public.farm_fertilizer_products
  for all to authenticated
  using (public.user_can_manage_farm_nutrient(farm_id))
  with check (public.user_can_manage_farm_nutrient(farm_id));

create policy farm_fertilizer_composition_lines_select on public.farm_fertilizer_composition_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.farm_fertilizer_products p
      where p.id = farm_product_id and p.farm_id in (select public.user_farm_ids())
    )
  );

create policy farm_fertilizer_composition_lines_write on public.farm_fertilizer_composition_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.farm_fertilizer_products p
      where p.id = farm_product_id and public.user_can_manage_farm_nutrient(p.farm_id)
    )
  )
  with check (
    exists (
      select 1 from public.farm_fertilizer_products p
      where p.id = farm_product_id and public.user_can_manage_farm_nutrient(p.farm_id)
    )
  );

create policy nutrient_recipes_select on public.nutrient_recipes
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()));

create policy nutrient_recipes_write on public.nutrient_recipes
  for all to authenticated
  using (public.user_can_manage_farm_nutrient(farm_id))
  with check (public.user_can_manage_farm_nutrient(farm_id));

create policy nutrient_recipe_doses_select on public.nutrient_recipe_doses
  for select to authenticated
  using (
    exists (
      select 1 from public.nutrient_recipes r
      where r.id = recipe_id and r.farm_id in (select public.user_farm_ids())
    )
  );

create policy nutrient_recipe_doses_write on public.nutrient_recipe_doses
  for all to authenticated
  using (
    exists (
      select 1 from public.nutrient_recipes r
      where r.id = recipe_id and public.user_can_manage_farm_nutrient(r.farm_id)
    )
  )
  with check (
    exists (
      select 1 from public.nutrient_recipes r
      where r.id = recipe_id and public.user_can_manage_farm_nutrient(r.farm_id)
    )
  );

-- Grants for public catalog read
grant select on public.nutrient_data_sources to anon, authenticated;
grant select on public.nutrient_elements to anon, authenticated;
grant select on public.nutrient_oxide_factors to anon, authenticated;
grant select on public.fertilizer_products to anon, authenticated;
grant select on public.fertilizer_composition_lines to anon, authenticated;
grant select on public.target_solution_profiles to anon, authenticated;
grant select on public.feed_schedules to anon, authenticated;
grant select on public.feed_schedule_steps to anon, authenticated;
grant select on public.fertilizer_product_aliases to anon, authenticated;
grant select on public.nutrient_catalog_recipes to anon, authenticated;
grant select on public.nutrient_catalog_recipe_lines to anon, authenticated;
grant select on public.nutrient_incompatibility_rules to anon, authenticated;

grant select, insert, update, delete on public.farm_water_profiles to authenticated;
grant select, insert, update, delete on public.farm_fertilizer_products to authenticated;
grant select, insert, update, delete on public.farm_fertilizer_composition_lines to authenticated;
grant select, insert, update, delete on public.nutrient_recipes to authenticated;
grant select, insert, update, delete on public.nutrient_recipe_doses to authenticated;
