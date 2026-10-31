-- Harvest + trimming grow stages; free stage choice (material entry rules only).

alter table public.grow_cycles drop constraint if exists grow_cycles_stage_check;
alter table public.grow_cycles add constraint grow_cycles_stage_check check (
  stage in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'harvest', 'drying', 'trimming', 'curing', 'completed'
  )
);

alter table public.playbook_thresholds drop constraint if exists playbook_thresholds_cycle_stage_check;
alter table public.playbook_thresholds add constraint playbook_thresholds_cycle_stage_check check (
  cycle_stage is null
  or cycle_stage in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'harvest', 'drying', 'trimming', 'curing', 'completed'
  )
);

alter table public.grow_cycle_stage_recipes drop constraint if exists grow_cycle_stage_recipes_stage_check;
alter table public.grow_cycle_stage_recipes add constraint grow_cycle_stage_recipes_stage_check check (
  stage in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'harvest', 'drying', 'trimming', 'curing', 'completed'
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
    when 'harvest' then 6
    when 'drying' then 7
    when 'trimming' then 8
    when 'curing' then 9
    when 'completed' then 10
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
    when 'harvest' then 'харвест'
    when 'drying' then 'сушка'
    when 'trimming' then 'тримминг'
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
begin
  if p_to_stage not in (
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'harvest', 'drying', 'trimming', 'curing', 'completed'
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

  if public.grower_stage_rank(p_from_stage) = 0 or public.grower_stage_rank(p_to_stage) = 0 then
    raise exception 'grow_cycle_stage: invalid stage';
  end if;
end;
$$;

create or replace function public.transition_grow_cycle_stage(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_new_stage text,
  p_occurred_at timestamptz default now(),
  p_allow_backward boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.grow_cycles;
  v_from_stage text;
  v_event public.events;
  v_end_date date;
  v_leaving_completed boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  if p_new_stage is null or trim(p_new_stage) = '' then
    raise exception 'grow_cycle_stage: new_stage required';
  end if;

  select * into v_cycle from public.grow_cycles where id = p_cycle_id and farm_id = p_farm_id;
  if not found then
    raise exception 'Invalid cycle';
  end if;

  if not exists (
    select 1 from public.scopes s
    where s.id = p_scope_id and s.farm_id = p_farm_id and s.cycle_id = p_cycle_id
  ) then
    raise exception 'grow_cycle_stage: scope_id must belong to cycle';
  end if;

  v_from_stage := v_cycle.stage;

  perform public.grow_cycle_assert_stage_transition(
    v_from_stage,
    p_new_stage,
    v_cycle.start_material,
    p_allow_backward
  );

  if p_new_stage = v_from_stage then
    return jsonb_build_object('cycle', to_jsonb(v_cycle), 'event', null);
  end if;

  v_leaving_completed := v_from_stage = 'completed' and p_new_stage <> 'completed';

  v_end_date := case
    when p_new_stage = 'completed' then public.farm_local_date(p_farm_id, coalesce(p_occurred_at, now()))
    when v_leaving_completed then null
    else v_cycle.end_date
  end;

  update public.grow_cycles
  set
    stage = p_new_stage,
    status = case
      when p_new_stage = 'completed' then 'harvested'
      when v_leaving_completed then 'active'
      else status
    end,
    end_date = v_end_date,
    updated_at = now()
  where id = p_cycle_id
  returning * into v_cycle;

  insert into public.events (
    farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by
  )
  values (
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    'stage_changed',
    format('Стадия: %s', public.grower_stage_label_ru(p_new_stage)),
    coalesce(p_occurred_at, now()),
    'user_form',
    jsonb_build_object('from_stage', v_from_stage, 'to_stage', p_new_stage),
    auth.uid()
  )
  returning * into v_event;

  return jsonb_build_object('cycle', to_jsonb(v_cycle), 'event', to_jsonb(v_event));
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
  p_lights_on_at time default '06:00',
  p_varieties jsonb default null
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
  v_variety jsonb;
  v_pg public.plant_groups;
  v_note_event_id uuid;
  v_varieties_out jsonb := '[]'::jsonb;
  v_cultivar_parts text[] := array[]::text[];
  v_cultivar_joined text;
  v_total_plants integer := 0;
  v_v_material text;
  v_v_count integer;
  v_v_name text;
  v_v_comment text;
  v_has_varieties boolean;
  v_occurred_at timestamptz;
  v_variety_idx integer := 0;
  v_plants_out jsonb;
  v_plant_idx integer;
  v_plant_id uuid;
  v_plant_ids jsonb;
  v_plant_num integer;
  v_plant_code text;
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

  v_has_varieties :=
    p_varieties is not null
    and jsonb_typeof(p_varieties) = 'array'
    and jsonb_array_length(p_varieties) > 0;

  if v_has_varieties then
    v_material := 'clone';
    for v_variety in select value from jsonb_array_elements(p_varieties) as t(value)
    loop
      v_v_material := coalesce(nullif(trim(v_variety->>'start_material'), ''), 'seed');
      if v_v_material not in ('seed', 'clone') then
        raise exception 'grow_cycle: invalid variety start_material';
      end if;
      if v_v_material = 'seed' then
        v_material := 'seed';
      end if;
      v_v_name := nullif(trim(v_variety->>'cultivar_name'), '');
      if v_v_name is not null then
        v_cultivar_parts := array_append(v_cultivar_parts, v_v_name);
      end if;
      if coalesce(v_variety->>'plant_count', '') ~ '^-?[0-9]+$' then
        v_v_count := (v_variety->>'plant_count')::integer;
        if v_v_count is not null and v_v_count >= 0 then
          v_total_plants := v_total_plants + v_v_count;
        end if;
      end if;
    end loop;

    v_cultivar_joined := nullif(array_to_string(v_cultivar_parts, ', '), '');
    p_cultivar_name := coalesce(v_cultivar_joined, p_cultivar_name);
    p_plant_count := case when v_total_plants > 0 then v_total_plants else p_plant_count end;
    p_start_material := v_material;
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
    'propagation', 'cloning', 'veg', 'preflower', 'flower', 'harvest', 'drying', 'trimming', 'curing', 'completed'
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

  v_occurred_at := (coalesce(p_start_date, current_date)::text || 'T12:00:00Z')::timestamptz;

  if v_has_varieties then
    for v_variety in select value from jsonb_array_elements(p_varieties) as t(value)
    loop
      v_v_name := nullif(trim(v_variety->>'cultivar_name'), '');
      v_v_material := coalesce(nullif(trim(v_variety->>'start_material'), ''), 'seed');
      v_v_comment := nullif(trim(v_variety->>'comment'), '');
      v_v_count := null;
      if coalesce(v_variety->>'plant_count', '') ~ '^-?[0-9]+$' then
        v_v_count := (v_variety->>'plant_count')::integer;
        if v_v_count is not null and v_v_count < 0 then
          v_v_count := null;
        end if;
      end if;

      if v_v_name is null and v_v_count is null and v_v_comment is null then
        continue;
      end if;

      v_variety_idx := v_variety_idx + 1;

      insert into public.plant_groups (
        farm_id,
        cycle_id,
        zone_id,
        name,
        group_type,
        metadata
      )
      values (
        p_farm_id,
        v_cycle.id,
        p_zone_id,
        coalesce(v_v_name, 'Сорт'),
        'variety',
        jsonb_strip_nulls(
          jsonb_build_object(
            'plant_count', v_v_count,
            'start_material', v_v_material,
            'cultivar_name', v_v_name
          )
        )
      )
      returning * into v_pg;

      v_note_event_id := null;
      if v_v_comment is not null then
        insert into public.events (
          farm_id,
          cycle_id,
          scope_id,
          plant_group_id,
          event_type,
          body,
          occurred_at,
          source_type,
          payload,
          created_by
        )
        values (
          p_farm_id,
          v_cycle.id,
          v_scope.id,
          v_pg.id,
          'note',
          v_v_comment,
          v_occurred_at,
          'user_form',
          jsonb_build_object('cycle_variety_setup', true),
          auth.uid()
        )
        returning id into v_note_event_id;
      end if;

      v_plants_out := '[]'::jsonb;
      if coalesce(v_v_count, 0) > 0 then
        v_plant_ids := coalesce(v_variety->'plant_ids', '[]'::jsonb);
        if jsonb_typeof(v_plant_ids) <> 'array' then
          raise exception 'grow_cycle: plant_ids must be a json array';
        end if;
        if jsonb_array_length(v_plant_ids) > 0 and jsonb_array_length(v_plant_ids) <> v_v_count then
          raise exception 'grow_cycle: plant_ids length must match plant_count';
        end if;

        for v_plant_idx in 0..(v_v_count - 1) loop
          v_plant_num := v_plant_idx + 1;
          if jsonb_array_length(v_plant_ids) > v_plant_idx then
            begin
              v_plant_id := (v_plant_ids->>v_plant_idx)::uuid;
            exception
              when others then
                raise exception 'grow_cycle: invalid plant id';
            end;
          else
            v_plant_id := gen_random_uuid();
          end if;

          v_plant_code := 'V' || v_variety_idx::text || '-' || v_plant_num::text;

          insert into public.plants (
            id,
            farm_id,
            cycle_id,
            zone_id,
            plant_code,
            cultivar_name,
            source_type,
            start_date,
            metadata
          )
          values (
            v_plant_id,
            p_farm_id,
            v_cycle.id,
            p_zone_id,
            v_plant_code,
            v_v_name,
            v_v_material,
            coalesce(p_start_date, current_date),
            jsonb_build_object(
              'plant_group_id', v_pg.id,
              'label_number', v_plant_num
            )
          );

          v_plants_out :=
            v_plants_out
            || jsonb_build_array(
              jsonb_build_object(
                'id', v_plant_id,
                'plant_code', v_plant_code,
                'label_number', v_plant_num,
                'cultivar_name', v_v_name
              )
            );
        end loop;
      end if;

      v_varieties_out :=
        v_varieties_out
        || jsonb_build_array(
          jsonb_build_object(
            'plant_group_id', v_pg.id,
            'note_event_id', v_note_event_id,
            'cultivar_name', v_v_name,
            'plants', v_plants_out
          )
        );
    end loop;
  end if;

  return jsonb_build_object(
    'cycle', to_jsonb(v_cycle),
    'scope', to_jsonb(v_scope),
    'varieties', v_varieties_out
  );
end;
$$;
