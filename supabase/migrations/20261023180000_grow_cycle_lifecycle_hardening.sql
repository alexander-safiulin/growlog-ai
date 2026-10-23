-- Lifecycle hardening: end_date on complete, forward-only stages, harvest weight patch.

drop function if exists public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz);
drop function if exists public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text);
drop function if exists public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time
);

create or replace function public.grower_stage_rank(p_stage text)
returns integer
language sql
immutable
as $$
  select case p_stage
    when 'propagation' then 1
    when 'veg' then 2
    when 'preflower' then 3
    when 'flower' then 4
    when 'drying' then 5
    when 'curing' then 6
    when 'completed' then 7
    else 0
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
  if p_to_stage not in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed') then
    raise exception 'grow_cycle_stage: invalid new_stage';
  end if;

  if coalesce(p_start_material, 'seed') = 'clone' and p_to_stage = 'propagation' then
    raise exception 'grow_cycle_stage: clone cycles cannot enter propagation';
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

  v_end_date := case
    when p_new_stage = 'completed' then public.farm_local_date(p_farm_id, coalesce(p_occurred_at, now()))
    else v_cycle.end_date
  end;

  update public.grow_cycles
  set
    stage = p_new_stage,
    status = case when p_new_stage = 'completed' then 'harvested' else status end,
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

create or replace function public.grow_cycle_harvest_event_body(
  p_wet_weight_kg numeric,
  p_dry_weight_kg numeric
)
returns text
language sql
immutable
as $$
  select format(
    'Урожай: сырая %s кг, сухая %s кг',
    coalesce(to_char(p_wet_weight_kg, 'FM999999990.##'), '—'),
    coalesce(to_char(p_dry_weight_kg, 'FM999999990.##'), '—')
  );
$$;

create or replace function public.upsert_grow_cycle_harvest(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_wet_weight_kg numeric default null,
  p_dry_weight_kg numeric default null,
  p_harvested_at timestamptz default now(),
  p_notes text default null,
  p_weight_patch jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_harvest public.harvest_records;
  v_event public.events;
  v_event_id uuid;
  v_existing uuid;
  v_wet numeric;
  v_dry numeric;
  v_body text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  if p_wet_weight_kg is not null and p_wet_weight_kg < 0 then
    raise exception 'grow_cycle_harvest: wet_weight_kg must be >= 0';
  end if;
  if p_dry_weight_kg is not null and p_dry_weight_kg < 0 then
    raise exception 'grow_cycle_harvest: dry_weight_kg must be >= 0';
  end if;

  if not exists (
    select 1 from public.grow_cycles c where c.id = p_cycle_id and c.farm_id = p_farm_id
  ) then
    raise exception 'Invalid cycle';
  end if;

  if not exists (
    select 1 from public.scopes s
    where s.id = p_scope_id and s.farm_id = p_farm_id and s.cycle_id = p_cycle_id
  ) then
    raise exception 'grow_cycle_harvest: scope_id must belong to cycle';
  end if;

  select id into v_existing
  from public.harvest_records
  where farm_id = p_farm_id and cycle_id = p_cycle_id
  order by harvested_at desc
  limit 1;

  v_event := null;

  if v_existing is not null then
    select wet_weight_kg, dry_weight_kg into v_wet, v_dry
    from public.harvest_records where id = v_existing;

    if p_weight_patch is not null then
      if p_weight_patch ? 'wet_weight_kg' then
        if p_weight_patch->'wet_weight_kg' is null or jsonb_typeof(p_weight_patch->'wet_weight_kg') = 'null' then
          v_wet := null;
        else
          v_wet := (p_weight_patch->>'wet_weight_kg')::numeric;
        end if;
      end if;
      if p_weight_patch ? 'dry_weight_kg' then
        if p_weight_patch->'dry_weight_kg' is null or jsonb_typeof(p_weight_patch->'dry_weight_kg') = 'null' then
          v_dry := null;
        else
          v_dry := (p_weight_patch->>'dry_weight_kg')::numeric;
        end if;
      end if;
    else
      if p_wet_weight_kg is not null then v_wet := p_wet_weight_kg; end if;
      if p_dry_weight_kg is not null then v_dry := p_dry_weight_kg; end if;
    end if;

    if v_wet is not null and v_wet < 0 then
      raise exception 'grow_cycle_harvest: wet_weight_kg must be >= 0';
    end if;
    if v_dry is not null and v_dry < 0 then
      raise exception 'grow_cycle_harvest: dry_weight_kg must be >= 0';
    end if;

    update public.harvest_records
    set
      wet_weight_kg = v_wet,
      dry_weight_kg = v_dry,
      harvested_at = coalesce(p_harvested_at, harvested_at),
      notes = case when p_notes is not null then nullif(trim(p_notes), '') else notes end,
      scope_id = p_scope_id
    where id = v_existing
    returning * into v_harvest;

    select event_id into v_event_id from public.harvest_records where id = v_existing;
    if v_event_id is not null then
      v_body := public.grow_cycle_harvest_event_body(v_harvest.wet_weight_kg, v_harvest.dry_weight_kg);
      update public.events
      set
        body = v_body,
        occurred_at = coalesce(p_harvested_at, occurred_at),
        payload = jsonb_build_object(
          'wet_weight_kg', v_harvest.wet_weight_kg,
          'dry_weight_kg', v_harvest.dry_weight_kg,
          'harvest_record_id', v_harvest.id
        )
      where id = v_event_id
      returning * into v_event;
    end if;
  else
    insert into public.harvest_records (
      farm_id, cycle_id, scope_id, harvested_at, wet_weight_kg, dry_weight_kg, notes
    )
    values (
      p_farm_id,
      p_cycle_id,
      p_scope_id,
      coalesce(p_harvested_at, now()),
      p_wet_weight_kg,
      p_dry_weight_kg,
      nullif(trim(p_notes), '')
    )
    returning * into v_harvest;

    v_body := public.grow_cycle_harvest_event_body(v_harvest.wet_weight_kg, v_harvest.dry_weight_kg);

    insert into public.events (
      farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by
    )
    values (
      p_farm_id,
      p_cycle_id,
      p_scope_id,
      'harvest',
      v_body,
      coalesce(p_harvested_at, now()),
      'user_form',
      jsonb_build_object(
        'wet_weight_kg', v_harvest.wet_weight_kg,
        'dry_weight_kg', v_harvest.dry_weight_kg,
        'harvest_record_id', v_harvest.id
      ),
      auth.uid()
    )
    returning * into v_event;

    update public.harvest_records set event_id = v_event.id where id = v_harvest.id;
  end if;

  return jsonb_build_object('harvest', to_jsonb(v_harvest), 'event', to_jsonb(v_event));
end;
$$;

-- Align feeding-log stage changes with forward-only rules.
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
  p_lights_on_at time default null,
  p_allow_backward boolean default false
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
  v_end_date date;
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
    perform public.grow_cycle_assert_stage_transition(
      v_cycle.stage,
      p_new_stage,
      v_cycle.start_material,
      p_allow_backward
    );
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
    v_end_date := case
      when p_new_stage = 'completed' then public.farm_local_date(p_farm_id, coalesce(p_occurred_at, now()))
      else v_cycle.end_date
    end;

    update public.grow_cycles
    set
      stage = p_new_stage,
      status = case when p_new_stage = 'completed' then 'harvested' else status end,
      end_date = v_end_date,
      updated_at = now()
    where id = p_cycle_id;

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

revoke all on function public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz, boolean) from public;
revoke all on function public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz, boolean) from anon;
grant execute on function public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz, boolean) to authenticated;

revoke all on function public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text, jsonb) from public;
revoke all on function public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text, jsonb) from anon;
grant execute on function public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text, jsonb) to authenticated;

revoke all on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean
) from public;
revoke all on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean
) from anon;
grant execute on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean
) to authenticated;
