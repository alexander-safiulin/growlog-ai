-- Harden grow-cycle RPCs: validations, user_form source, grants, dose farm scope.

create or replace function public.grower_stage_label_ru(p_stage text)
returns text
language sql
immutable
as $$
  select case p_stage
    when 'propagation' then 'проращивание'
    when 'veg' then 'вегетация'
    when 'preflower' then 'предцвет'
    when 'flower' then 'цветение'
    when 'drying' then 'сушка'
    when 'curing' then 'доводка'
    when 'completed' then 'завершён'
    else coalesce(p_stage, '')
  end;
$$;

alter table public.grow_cycle_feeding_entry_doses
  add column if not exists farm_id uuid references public.farms(id) on delete cascade;

update public.grow_cycle_feeding_entry_doses d
set farm_id = e.farm_id
from public.grow_cycle_feeding_entries e
where e.id = d.entry_id and d.farm_id is null;

alter table public.grow_cycle_feeding_entry_doses
  alter column farm_id set not null;

create or replace function public.grow_cycle_guard_feeding_entry_dose()
returns trigger
language plpgsql
as $$
declare
  v_farm uuid;
begin
  select e.farm_id into v_farm
  from public.grow_cycle_feeding_entries e
  where e.id = new.entry_id;

  if v_farm is null then
    raise exception 'grow_cycle_feeding_entry_doses: invalid entry_id';
  end if;

  new.farm_id := v_farm;

  if new.fertilizer_product_id is not null then
    if not exists (
      select 1 from public.fertilizer_products fp
      where fp.id = new.fertilizer_product_id
        and (fp.farm_id is null or fp.farm_id = v_farm)
    ) then
      raise exception 'grow_cycle_feeding_entry_doses: fertilizer_product_id cross-farm';
    end if;
  end if;

  if new.farm_fertilizer_product_id is not null then
    if not exists (
      select 1 from public.farm_fertilizer_products ffp
      where ffp.id = new.farm_fertilizer_product_id and ffp.farm_id = v_farm
    ) then
      raise exception 'grow_cycle_feeding_entry_doses: farm_fertilizer_product_id cross-farm';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists grow_cycle_feeding_entry_doses_guard on public.grow_cycle_feeding_entry_doses;
create trigger grow_cycle_feeding_entry_doses_guard
  before insert or update on public.grow_cycle_feeding_entry_doses
  for each row execute function public.grow_cycle_guard_feeding_entry_dose();

drop trigger if exists grow_cycle_feeding_entry_doses_validate_farm_refs on public.grow_cycle_feeding_entry_doses;
create trigger grow_cycle_feeding_entry_doses_validate_farm_refs
  before insert or update on public.grow_cycle_feeding_entry_doses
  for each row execute function public.validate_referenced_farms(
    'farm_fertilizer_product_id', 'farm_fertilizer_products'
  );

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
  v_on smallint;
  v_off smallint;
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

  v_stage := coalesce(nullif(trim(p_stage), ''), 'veg');
  if p_start_material = 'clone' and v_stage = 'propagation' then
    v_stage := 'veg';
  end if;

  if v_stage not in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed') then
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
    coalesce(p_start_material, 'seed'),
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
  v_fp uuid;
  v_ffp uuid;
  v_amount_ml numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  if p_entry_kind is null or p_entry_kind not in ('watering', 'feeding') then
    raise exception 'grow_cycle_feeding: invalid entry_kind';
  end if;

  if p_volume_ml is null or p_volume_ml <= 0 then
    raise exception 'grow_cycle_feeding: invalid volume_ml';
  end if;

  select * into v_cycle from public.grow_cycles where id = p_cycle_id and farm_id = p_farm_id;
  if not found then
    raise exception 'Invalid cycle';
  end if;

  if not exists (
    select 1 from public.scopes s
    where s.id = p_scope_id and s.farm_id = p_farm_id and s.cycle_id = p_cycle_id
  ) then
    raise exception 'grow_cycle_feeding: scope_id must belong to cycle';
  end if;

  if p_recipe_id is not null then
    if not exists (
      select 1 from public.nutrient_recipes r
      where r.id = p_recipe_id and r.farm_id = p_farm_id
    ) then
      raise exception 'grow_cycle_feeding: recipe_id cross-farm';
    end if;
  end if;

  if p_new_stage is not null and trim(p_new_stage) <> '' then
    if p_new_stage not in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed') then
      raise exception 'grow_cycle_feeding: invalid new_stage';
    end if;
    if coalesce(v_cycle.start_material, 'seed') = 'clone' and p_new_stage = 'propagation' then
      raise exception 'grow_cycle_feeding: clone cycles cannot enter propagation';
    end if;
  end if;

  if p_light_hours_on is not null and p_light_hours_off is not null then
    if p_light_hours_on + p_light_hours_off <> 24 then
      raise exception 'grow_cycle_feeding: light hours must sum to 24';
    end if;
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
    'user_form',
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
    v_fp := nullif(v_dose->>'fertilizer_product_id', '')::uuid;
    v_ffp := nullif(v_dose->>'farm_fertilizer_product_id', '')::uuid;

    if v_fp is not null then
      if not exists (
        select 1 from public.fertilizer_products fp
        where fp.id = v_fp and (fp.farm_id is null or fp.farm_id = p_farm_id)
      ) then
        raise exception 'grow_cycle_feeding: dose fertilizer_product_id cross-farm';
      end if;
    end if;

    if v_ffp is not null then
      if not exists (
        select 1 from public.farm_fertilizer_products ffp
        where ffp.id = v_ffp and ffp.farm_id = p_farm_id
      ) then
        raise exception 'grow_cycle_feeding: dose farm_fertilizer_product_id cross-farm';
      end if;
    end if;

    if v_dose->>'amount_ml' is null or trim(v_dose->>'amount_ml') = '' then
      raise exception 'grow_cycle_feeding: dose amount_ml required';
    end if;
    v_amount_ml := (v_dose->>'amount_ml')::numeric;
    if v_amount_ml is null or v_amount_ml < 0 then
      raise exception 'grow_cycle_feeding: invalid dose amount_ml';
    end if;

    insert into public.grow_cycle_feeding_entry_doses (
      entry_id,
      farm_id,
      fertilizer_product_id,
      farm_fertilizer_product_id,
      product_label,
      amount_ml
    )
    values (
      v_entry.id,
      p_farm_id,
      v_fp,
      v_ffp,
      coalesce(v_dose->>'product_label', 'Продукт'),
      v_amount_ml
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
      format(
        'Стадия: %s',
        public.grower_stage_label_ru(p_new_stage)
      ),
      coalesce(p_occurred_at, now()),
      'user_form',
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

revoke all on function public.create_grow_cycle_tracking(
  uuid, text, text, date, text, uuid, integer, text, smallint, smallint, time
) from public;
revoke all on function public.create_grow_cycle_tracking(
  uuid, text, text, date, text, uuid, integer, text, smallint, smallint, time
) from anon;

revoke all on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time
) from public;
revoke all on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time
) from anon;

grant execute on function public.create_grow_cycle_tracking(
  uuid, text, text, date, text, uuid, integer, text, smallint, smallint, time
) to authenticated;

grant execute on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time
) to authenticated;
