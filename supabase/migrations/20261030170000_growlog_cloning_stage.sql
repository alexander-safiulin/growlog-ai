-- Grow cycle stage: cloning (клонирование) for clone starts; sprout-tier entry alongside propagation.

alter table public.grow_cycles drop constraint if exists grow_cycles_stage_check;
alter table public.grow_cycles add constraint grow_cycles_stage_check check (
  stage in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed'
  )
);

alter table public.playbook_thresholds drop constraint if exists playbook_thresholds_cycle_stage_check;
alter table public.playbook_thresholds add constraint playbook_thresholds_cycle_stage_check check (
  cycle_stage is null
  or cycle_stage in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed'
  )
);

alter table public.grow_cycle_stage_recipes drop constraint if exists grow_cycle_stage_recipes_stage_check;
alter table public.grow_cycle_stage_recipes add constraint grow_cycle_stage_recipes_stage_check check (
  stage in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed'
  )
);

create or replace function public.grower_stage_rank(p_stage text)
returns integer
language sql
immutable
as $$
  select case p_stage
    when 'propagation' then 1
    when 'cloning' then 2
    when 'veg' then 3
    when 'preflower' then 4
    when 'flower' then 5
    when 'drying' then 6
    when 'curing' then 7
    when 'completed' then 8
    else 0
  end;
$$;

create or replace function public.grower_stage_label_ru(p_stage text)
returns text
language sql
immutable
as $$
  select case p_stage
    when 'propagation' then 'проращивание'
    when 'cloning' then 'клонирование'
    when 'veg' then 'вегетация'
    when 'preflower' then 'предцвет'
    when 'flower' then 'цветение'
    when 'drying' then 'сушка'
    when 'curing' then 'пролечка'
    when 'completed' then 'завершён'
    else coalesce(p_stage, '')
  end;
$$;

create or replace function public.grow_cycle_assert_stage_transition(
  p_from_stage text,
  p_to_stage text,
  p_start_material text,
  p_allow_backward boolean
)
returns void
language plpgsql
as $$
declare
  v_from_rank integer;
  v_to_rank integer;
begin
  if p_to_stage not in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed'
  ) then
    raise exception 'grow_cycle_stage: invalid new_stage';
  end if;

  if coalesce(p_start_material, 'seed') = 'clone' and p_to_stage = 'propagation' then
    raise exception 'grow_cycle_stage: clone cycles cannot enter propagation';
  end if;

  if coalesce(p_start_material, 'seed') = 'seed' and p_to_stage = 'cloning' then
    raise exception 'grow_cycle_stage: seed cycles cannot enter cloning';
  end if;

  if p_from_stage = p_to_stage then
    return;
  end if;

  v_from_rank := public.grower_stage_rank(p_from_stage);
  v_to_rank := public.grower_stage_rank(p_to_stage);

  if v_from_rank = 0 or v_to_rank = 0 then
    raise exception 'grow_cycle_stage: invalid stage';
  end if;

  if v_to_rank < v_from_rank and not coalesce(p_allow_backward, false) then
    raise exception 'grow_cycle_stage: backward stage transition not allowed';
  end if;
end;
$$;

create or replace function public.create_grow_cycle_tracking(
  p_farm_id uuid,
  p_name text,
  p_cultivar_name text default null,
  p_start_date date default current_date,
  p_stage text default null,
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
  v_on smallint;
  v_off smallint;
  v_material text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  v_on := coalesce(p_light_hours_on, 18);
  v_off := coalesce(p_light_hours_off, 6);
  if v_on + v_off <> 24 then
    raise exception 'grow_cycle: light hours must sum to 24';
  end if;

  if p_zone_id is not null then
    if not exists (
      select 1 from public.farm_zones z where z.id = p_zone_id and z.farm_id = p_farm_id
    ) then
      raise exception 'grow_cycle: zone_id must belong to farm_id';
    end if;
  end if;

  v_material := coalesce(p_start_material, 'seed');

  v_stage := coalesce(
    nullif(trim(p_stage), ''),
    case when v_material = 'clone' then 'cloning' else 'propagation' end
  );

  if v_material = 'clone' and v_stage = 'propagation' then
    v_stage := 'cloning';
  end if;

  if v_material = 'seed' and v_stage = 'cloning' then
    v_stage := 'propagation';
  end if;

  if v_stage not in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed'
  ) then
    raise exception 'grow_cycle: invalid stage';
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
    v_material,
    v_on,
    v_off,
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
    v_on,
    v_off,
    coalesce(p_lights_on_at, '06:00'::time),
    auth.uid()
  );

  return jsonb_build_object('cycle', to_jsonb(v_cycle), 'scope', to_jsonb(v_scope));
end;
$$;
