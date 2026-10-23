-- Harvest upsert + validated stage transitions (clone cannot enter propagation).

create or replace function public.transition_grow_cycle_stage(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_new_stage text,
  p_occurred_at timestamptz default now()
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

  if p_new_stage not in ('propagation', 'veg', 'preflower', 'flower', 'drying', 'curing', 'completed') then
    raise exception 'grow_cycle_stage: invalid new_stage';
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

  if coalesce(v_cycle.start_material, 'seed') = 'clone' and p_new_stage = 'propagation' then
    raise exception 'grow_cycle_stage: clone cycles cannot enter propagation';
  end if;

  v_from_stage := v_cycle.stage;

  if p_new_stage = v_from_stage then
    return jsonb_build_object('cycle', to_jsonb(v_cycle), 'event', null);
  end if;

  update public.grow_cycles
  set
    stage = p_new_stage,
    status = case when p_new_stage = 'completed' then 'harvested' else status end,
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

create or replace function public.upsert_grow_cycle_harvest(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_wet_weight_kg numeric default null,
  p_dry_weight_kg numeric default null,
  p_harvested_at timestamptz default now(),
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_harvest public.harvest_records;
  v_event public.events;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
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
    update public.harvest_records
    set
      wet_weight_kg = coalesce(p_wet_weight_kg, wet_weight_kg),
      dry_weight_kg = coalesce(p_dry_weight_kg, dry_weight_kg),
      harvested_at = coalesce(p_harvested_at, harvested_at),
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      scope_id = p_scope_id
    where id = v_existing
    returning * into v_harvest;
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

    insert into public.events (
      farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by
    )
    values (
      p_farm_id,
      p_cycle_id,
      p_scope_id,
      'harvest',
      'Урожай',
      coalesce(p_harvested_at, now()),
      'user_form',
      jsonb_build_object(
        'wet_weight_kg', p_wet_weight_kg,
        'dry_weight_kg', p_dry_weight_kg,
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

revoke all on function public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz) from public;
revoke all on function public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz) from anon;
grant execute on function public.transition_grow_cycle_stage(uuid, uuid, uuid, text, timestamptz) to authenticated;

revoke all on function public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text) from public;
revoke all on function public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text) from anon;
grant execute on function public.upsert_grow_cycle_harvest(uuid, uuid, uuid, numeric, numeric, timestamptz, text) to authenticated;
