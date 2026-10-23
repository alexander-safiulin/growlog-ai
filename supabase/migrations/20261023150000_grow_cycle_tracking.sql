-- Grow cycle tracking: reusable stage recipes, light schedule, structured feeding, cycle metadata.

-- ─── Extend stage enum (preflower) ───────────────────────────────────────────

alter table public.grow_cycles drop constraint if exists grow_cycles_stage_check;
alter table public.grow_cycles add constraint grow_cycles_stage_check check (
  stage in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed')
);

alter table public.playbook_thresholds drop constraint if exists playbook_thresholds_cycle_stage_check;
alter table public.playbook_thresholds add constraint playbook_thresholds_cycle_stage_check check (
  cycle_stage is null
  or cycle_stage in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed')
);

-- ─── Cycle columns ───────────────────────────────────────────────────────────

alter table public.grow_cycles
  add column if not exists plant_count integer check (plant_count is null or plant_count >= 0),
  add column if not exists start_material text check (
    start_material is null or start_material in ('seed', 'clone')
  ),
  add column if not exists light_hours_on smallint check (
    light_hours_on is null or (light_hours_on >= 0 and light_hours_on <= 24)
  ),
  add column if not exists light_hours_off smallint check (
    light_hours_off is null or (light_hours_off >= 0 and light_hours_off <= 24)
  ),
  add column if not exists lights_on_at time;

-- ─── Stage ↔ library recipe link ─────────────────────────────────────────────

create table if not exists public.grow_cycle_stage_recipes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid not null references public.grow_cycles(id) on delete cascade,
  stage text not null check (
    stage in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed')
  ),
  recipe_id uuid not null references public.nutrient_recipes(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, stage)
);

create index if not exists grow_cycle_stage_recipes_cycle_idx
  on public.grow_cycle_stage_recipes (cycle_id);

drop trigger if exists grow_cycle_stage_recipes_updated_at on public.grow_cycle_stage_recipes;
create trigger grow_cycle_stage_recipes_updated_at
  before update on public.grow_cycle_stage_recipes
  for each row execute function public.set_updated_at();

drop trigger if exists grow_cycle_stage_recipes_validate_farm_refs on public.grow_cycle_stage_recipes;
create trigger grow_cycle_stage_recipes_validate_farm_refs
  before insert or update on public.grow_cycle_stage_recipes
  for each row execute function public.validate_referenced_farms(
    'cycle_id', 'grow_cycles',
    'recipe_id', 'nutrient_recipes'
  );

alter table public.grow_cycle_stage_recipes enable row level security;
drop policy if exists grow_cycle_stage_recipes_all on public.grow_cycle_stage_recipes;
create policy grow_cycle_stage_recipes_all on public.grow_cycle_stage_recipes for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

grant select, insert, update, delete on public.grow_cycle_stage_recipes to authenticated;

-- Backfill from legacy nutrient_recipes.cycle_id (non-destructive; column retained).
insert into public.grow_cycle_stage_recipes (farm_id, cycle_id, stage, recipe_id)
select r.farm_id, r.cycle_id, c.stage, r.id
from public.nutrient_recipes r
join public.grow_cycles c on c.id = r.cycle_id
where r.cycle_id is not null
on conflict (cycle_id, stage) do nothing;

-- ─── Light schedule history ────────────────────────────────────────────────────

create table if not exists public.grow_cycle_light_schedules (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid not null references public.grow_cycles(id) on delete cascade,
  light_hours_on smallint not null check (light_hours_on >= 0 and light_hours_on <= 24),
  light_hours_off smallint not null check (light_hours_off >= 0 and light_hours_off <= 24),
  lights_on_at time not null default '06:00',
  effective_from timestamptz not null default now(),
  source_event_id uuid references public.events(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists grow_cycle_light_schedules_cycle_idx
  on public.grow_cycle_light_schedules (cycle_id, effective_from desc);

drop trigger if exists grow_cycle_light_schedules_validate_farm_refs on public.grow_cycle_light_schedules;
create trigger grow_cycle_light_schedules_validate_farm_refs
  before insert or update on public.grow_cycle_light_schedules
  for each row execute function public.validate_referenced_farms(
    'cycle_id', 'grow_cycles',
    'source_event_id', 'events'
  );

alter table public.grow_cycle_light_schedules enable row level security;
drop policy if exists grow_cycle_light_schedules_all on public.grow_cycle_light_schedules;
create policy grow_cycle_light_schedules_all on public.grow_cycle_light_schedules for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

grant select, insert, update, delete on public.grow_cycle_light_schedules to authenticated;

-- ─── Structured watering / feeding (extends events spine) ─────────────────────

create table if not exists public.grow_cycle_feeding_entries (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  event_id uuid not null unique references public.events(id) on delete cascade,
  cycle_id uuid not null references public.grow_cycles(id) on delete cascade,
  entry_kind text not null check (entry_kind in ('watering', 'feeding')),
  volume_ml numeric not null check (volume_ml > 0),
  ph numeric,
  ec_ms numeric,
  air_temp_c numeric,
  air_rh_pct numeric check (air_rh_pct is null or (air_rh_pct >= 0 and air_rh_pct <= 100)),
  recipe_id uuid references public.nutrient_recipes(id) on delete set null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grow_cycle_feeding_entry_doses (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.grow_cycle_feeding_entries(id) on delete cascade,
  fertilizer_product_id uuid references public.fertilizer_products(id) on delete set null,
  farm_fertilizer_product_id uuid references public.farm_fertilizer_products(id) on delete set null,
  product_label text not null,
  amount_ml numeric not null check (amount_ml >= 0),
  created_at timestamptz not null default now()
);

create index if not exists grow_cycle_feeding_entries_cycle_idx
  on public.grow_cycle_feeding_entries (cycle_id, created_at desc);

drop trigger if exists grow_cycle_feeding_entries_updated_at on public.grow_cycle_feeding_entries;
create trigger grow_cycle_feeding_entries_updated_at
  before update on public.grow_cycle_feeding_entries
  for each row execute function public.set_updated_at();

drop trigger if exists grow_cycle_feeding_entries_validate_farm_refs on public.grow_cycle_feeding_entries;
create trigger grow_cycle_feeding_entries_validate_farm_refs
  before insert or update on public.grow_cycle_feeding_entries
  for each row execute function public.validate_referenced_farms(
    'cycle_id', 'grow_cycles',
    'event_id', 'events',
    'recipe_id', 'nutrient_recipes'
  );

alter table public.grow_cycle_feeding_entries enable row level security;
alter table public.grow_cycle_feeding_entry_doses enable row level security;

drop policy if exists grow_cycle_feeding_entries_all on public.grow_cycle_feeding_entries;
create policy grow_cycle_feeding_entries_all on public.grow_cycle_feeding_entries for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

drop policy if exists grow_cycle_feeding_entry_doses_all on public.grow_cycle_feeding_entry_doses;
create policy grow_cycle_feeding_entry_doses_all on public.grow_cycle_feeding_entry_doses for all
  using (
    exists (
      select 1 from public.grow_cycle_feeding_entries e
      where e.id = entry_id and e.farm_id in (select public.user_farm_ids())
    )
  )
  with check (
    exists (
      select 1 from public.grow_cycle_feeding_entries e
      where e.id = entry_id and e.farm_id in (select public.user_farm_ids())
    )
  );

grant select, insert, update, delete on public.grow_cycle_feeding_entries to authenticated;
grant select, insert, update, delete on public.grow_cycle_feeding_entry_doses to authenticated;

-- ─── RPC: create cycle with tracking fields ────────────────────────────────────

create or replace function public.create_grow_cycle_tracking(
  p_farm_id uuid,
  p_name text,
  p_cultivar_name text default null,
  p_start_date date default current_date,
  p_stage text default 'veg',
  p_zone_id uuid default null,
  p_plant_count integer default null,
  p_start_material text default 'seed',
  p_light_hours_on smallint default 18,
  p_light_hours_off smallint default 6,
  p_lights_on_at time default '06:00'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.grow_cycles;
  v_scope public.scopes;
  v_stage text;
  v_zone_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  v_stage := coalesce(nullif(trim(p_stage), ''), 'veg');
  if p_start_material = 'clone' and v_stage = 'propagation' then
    v_stage := 'veg';
  end if;

  insert into public.grow_cycles (
    farm_id,
    zone_id,
    name,
    cultivar_name,
    start_date,
    status,
    stage,
    plant_count,
    start_material,
    light_hours_on,
    light_hours_off,
    lights_on_at,
    created_by
  )
  values (
    p_farm_id,
    p_zone_id,
    coalesce(nullif(trim(p_name), ''), 'Цикл'),
    nullif(trim(p_cultivar_name), ''),
    coalesce(p_start_date, current_date),
    'active',
    v_stage,
    p_plant_count,
    coalesce(p_start_material, 'seed'),
    p_light_hours_on,
    p_light_hours_off,
    coalesce(p_lights_on_at, '06:00'::time),
    auth.uid()
  )
  returning * into v_cycle;

  if p_zone_id is not null then
    select z.name into v_zone_name from public.farm_zones z where z.id = p_zone_id;
  end if;

  insert into public.scopes (farm_id, cycle_id, zone_id, scope_type, display_name)
  values (
    p_farm_id,
    v_cycle.id,
    p_zone_id,
    case when p_zone_id is not null then 'zone' else 'tent' end,
    coalesce(v_zone_name, 'Основной')
  )
  returning * into v_scope;

  insert into public.grow_cycle_light_schedules (
    farm_id, cycle_id, light_hours_on, light_hours_off, lights_on_at, created_by
  )
  values (
    p_farm_id,
    v_cycle.id,
    coalesce(p_light_hours_on, 18),
    coalesce(p_light_hours_off, 6),
    coalesce(p_lights_on_at, '06:00'::time),
    auth.uid()
  );

  return jsonb_build_object('cycle', to_jsonb(v_cycle), 'scope', to_jsonb(v_scope));
end;
$$;

grant execute on function public.create_grow_cycle_tracking(
  uuid, text, text, date, text, uuid, integer, text, smallint, smallint, time
) to authenticated;

-- ─── RPC: structured watering / feeding log ──────────────────────────────────

create or replace function public.create_grow_cycle_feeding_log(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_entry_kind text,
  p_volume_ml numeric,
  p_ph numeric default null,
  p_ec_ms numeric default null,
  p_air_temp_c numeric default null,
  p_air_rh_pct numeric default null,
  p_recipe_id uuid default null,
  p_comment text default null,
  p_occurred_at timestamptz default now(),
  p_doses jsonb default '[]'::jsonb,
  p_new_stage text default null,
  p_light_hours_on smallint default null,
  p_light_hours_off smallint default null,
  p_lights_on_at time default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_entry public.grow_cycle_feeding_entries;
  v_body text;
  v_dose jsonb;
  v_cycle public.grow_cycles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  select * into v_cycle from public.grow_cycles where id = p_cycle_id and farm_id = p_farm_id;
  if not found then
    raise exception 'Invalid cycle';
  end if;

  v_body := case
    when p_entry_kind = 'feeding' then format('Подкормка, %s мл', round(p_volume_ml::numeric, 0))
    else format('Полив, %s мл', round(p_volume_ml::numeric, 0))
  end;

  insert into public.events (
    farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by
  )
  values (
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    p_entry_kind,
    v_body,
    coalesce(p_occurred_at, now()),
    'manual',
    jsonb_build_object(
      'volume_ml', p_volume_ml,
      'ph', p_ph,
      'ec_ms', p_ec_ms,
      'air_temp_c', p_air_temp_c,
      'air_rh_pct', p_air_rh_pct,
      'recipe_id', p_recipe_id
    ),
    auth.uid()
  )
  returning * into v_event;

  insert into public.grow_cycle_feeding_entries (
    farm_id, event_id, cycle_id, entry_kind, volume_ml, ph, ec_ms, air_temp_c, air_rh_pct, recipe_id, comment
  )
  values (
    p_farm_id,
    v_event.id,
    p_cycle_id,
    p_entry_kind,
    p_volume_ml,
    p_ph,
    p_ec_ms,
    p_air_temp_c,
    p_air_rh_pct,
    p_recipe_id,
    nullif(trim(p_comment), '')
  )
  returning * into v_entry;

  for v_dose in select * from jsonb_array_elements(coalesce(p_doses, '[]'::jsonb))
  loop
    insert into public.grow_cycle_feeding_entry_doses (
      entry_id,
      fertilizer_product_id,
      farm_fertilizer_product_id,
      product_label,
      amount_ml
    )
    values (
      v_entry.id,
      nullif(v_dose->>'fertilizer_product_id', '')::uuid,
      nullif(v_dose->>'farm_fertilizer_product_id', '')::uuid,
      coalesce(v_dose->>'product_label', 'Продукт'),
      coalesce((v_dose->>'amount_ml')::numeric, 0)
    );
  end loop;

  if p_new_stage is not null and trim(p_new_stage) <> '' and p_new_stage <> v_cycle.stage then
    update public.grow_cycles set stage = p_new_stage, updated_at = now()
    where id = p_cycle_id;

    insert into public.events (
      farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by
    )
    values (
      p_farm_id,
      p_cycle_id,
      p_scope_id,
      'stage_changed',
      format('Стадия: %s', p_new_stage),
      coalesce(p_occurred_at, now()),
      'manual',
      jsonb_build_object('from_stage', v_cycle.stage, 'to_stage', p_new_stage),
      auth.uid()
    );
  end if;

  if p_light_hours_on is not null and p_light_hours_off is not null then
    update public.grow_cycles
    set
      light_hours_on = p_light_hours_on,
      light_hours_off = p_light_hours_off,
      lights_on_at = coalesce(p_lights_on_at, lights_on_at),
      updated_at = now()
    where id = p_cycle_id;

    insert into public.grow_cycle_light_schedules (
      farm_id,
      cycle_id,
      light_hours_on,
      light_hours_off,
      lights_on_at,
      effective_from,
      source_event_id,
      created_by
    )
    values (
      p_farm_id,
      p_cycle_id,
      p_light_hours_on,
      p_light_hours_off,
      coalesce(p_lights_on_at, v_cycle.lights_on_at, '06:00'::time),
      coalesce(p_occurred_at, now()),
      v_event.id,
      auth.uid()
    );
  end if;

  return jsonb_build_object('event', to_jsonb(v_event), 'entry', to_jsonb(v_entry));
end;
$$;

grant execute on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time
) to authenticated;
