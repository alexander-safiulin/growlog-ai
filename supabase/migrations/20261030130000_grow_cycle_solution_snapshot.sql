-- Grow cycle journal: immutable nutrient solution snapshot on watering/feeding events;
-- optional recipe link per feed-system week step.

alter table public.farm_feed_system_steps
  add column if not exists recipe_id uuid references public.nutrient_recipes(id) on delete set null;

create index if not exists farm_feed_system_steps_recipe_idx
  on public.farm_feed_system_steps (recipe_id)
  where recipe_id is not null;

alter table public.grow_cycle_feeding_entries
  add column if not exists solution_snapshot jsonb;

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
  if new.recipe_id is not null then
    if not exists (
      select 1 from public.nutrient_recipes r
      where r.id = new.recipe_id and r.farm_id = new.farm_id
    ) then
      raise exception 'farm_feed_system_steps: recipe_id must belong to farm_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.grow_cycle_build_solution_snapshot(
  p_farm_id uuid,
  p_recipe_id uuid,
  p_include_composition boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_recipe public.nutrient_recipes;
  v_doses jsonb;
  v_achieved jsonb;
  v_ec numeric;
begin
  if p_recipe_id is null then
    return null;
  end if;

  select * into v_recipe
  from public.nutrient_recipes r
  where r.id = p_recipe_id and r.farm_id = p_farm_id;

  if not found then
    raise exception 'grow_cycle_feeding: recipe_id cross-farm';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_label', d.fertilizer_label,
        'dose_per_l', d.dose_per_l,
        'unit', d.unit::text,
        'tank', d.tank,
        'fertilizer_product_id', d.fertilizer_product_id,
        'farm_fertilizer_product_id', d.farm_fertilizer_product_id
      )
      order by d.created_at
    ),
    '[]'::jsonb
  )
  into v_doses
  from public.nutrient_recipe_doses d
  where d.recipe_id = p_recipe_id;

  v_achieved := v_recipe.result #> '{best,achievedPpm}';
  v_ec := nullif(trim(v_recipe.result #>> '{best,ecEstimateMsCm}'), '')::numeric;

  return jsonb_build_object(
    'recipe_id', v_recipe.id,
    'name', v_recipe.name,
    'solution_kind', v_recipe.solution_kind::text,
    'doses_per_l', v_doses,
    'elements_mg_per_l', case when p_include_composition then v_achieved else null end,
    'ec_ms_calculated', case when p_include_composition then v_ec else null end
  );
end;
$$;

revoke all on function public.grow_cycle_build_solution_snapshot(uuid, uuid, boolean) from public;
revoke all on function public.grow_cycle_build_solution_snapshot(uuid, uuid, boolean) from anon;
grant execute on function public.grow_cycle_build_solution_snapshot(uuid, uuid, boolean) to authenticated;

drop function if exists public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean
);

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
  p_allow_backward boolean default false,
  p_recipe_composition_trusted boolean default true
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
  v_leaving_completed boolean;
  v_snapshot jsonb;
  v_payload jsonb;
  v_include_composition boolean;
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

  v_include_composition := p_recipe_id is not null
    and (
      p_entry_kind = 'watering'
      or coalesce(p_recipe_composition_trusted, true)
    );

  v_snapshot := public.grow_cycle_build_solution_snapshot(p_farm_id, p_recipe_id, v_include_composition);

  v_body := case
    when p_entry_kind = 'feeding' then format('Подкормка, %s мл', round(p_volume_ml::numeric, 0))
    else format('Полив, %s мл', round(p_volume_ml::numeric, 0))
  end;

  v_payload := jsonb_build_object(
    'volume_ml', p_volume_ml,
    'ph', p_ph,
    'ec_ms', p_ec_ms,
    'air_temp_c', p_air_temp_c,
    'air_rh_pct', p_air_rh_pct,
    'recipe_id', p_recipe_id
  );
  if v_snapshot is not null then
    v_payload := v_payload || jsonb_build_object('solution_snapshot', v_snapshot);
  end if;

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
    v_payload,
    auth.uid()
  )
  returning * into v_event;

  insert into public.grow_cycle_feeding_entries (
    farm_id,
    event_id,
    cycle_id,
    entry_kind,
    volume_ml,
    ph,
    ec_ms,
    air_temp_c,
    air_rh_pct,
    recipe_id,
    comment,
    solution_snapshot
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
    nullif(trim(p_comment), ''),
    v_snapshot
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
    v_leaving_completed := v_cycle.stage = 'completed'
      and p_new_stage <> 'completed'
      and coalesce(p_allow_backward, false);

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

revoke all on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean, boolean
) from public;
revoke all on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean, boolean
) from anon;
grant execute on function public.create_grow_cycle_feeding_log(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, text, timestamptz, jsonb, text, smallint, smallint, time, boolean, boolean
) to authenticated;
