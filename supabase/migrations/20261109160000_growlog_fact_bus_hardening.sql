-- ADR-017: timeline RPCs enqueue derived jobs; SOP execute via RPC.

create or replace function public.enqueue_standard_event_jobs_for_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if p_event_id is null then
    return jsonb_build_object('skipped', true, 'reason', 'null_event_id');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('skipped', true, 'reason', 'event_not_found');
  end if;

  if v_event.farm_id is null then
    return jsonb_build_object('skipped', true, 'reason', 'missing_farm_id');
  end if;

  return public.enqueue_standard_event_jobs(
    v_event.farm_id,
    v_event.cycle_id,
    v_event.scope_id,
    v_event.id,
    coalesce(v_event.occurred_at, now())
  );
end;
$$;

revoke all on function public.enqueue_standard_event_jobs_for_event(uuid) from public;
grant execute on function public.enqueue_standard_event_jobs_for_event(uuid) to authenticated;

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
  v_jobs jsonb;
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

  v_jobs := public.enqueue_standard_event_jobs(
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    v_event.id,
    coalesce(p_occurred_at, now())
  );

  return jsonb_build_object('cycle', to_jsonb(v_cycle), 'event', to_jsonb(v_event), 'jobs', v_jobs);
end;
$$;

create or replace function public.create_sop_run_with_due_event(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_sop_definition_id uuid,
  p_trigger_id uuid,
  p_assignment_id uuid,
  p_anchor_date date,
  p_due_at timestamptz,
  p_due_window_start timestamptz,
  p_due_window_end timestamptz,
  p_priority text,
  p_reason_text text,
  p_trigger_snapshot jsonb,
  p_source_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_event_id uuid;
  v_prio text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  perform public.assert_fk_farm(p_farm_id, 'grow_cycles', p_cycle_id, 'create_sop_run_with_due_event.cycle_id');
  perform public.assert_fk_farm(p_farm_id, 'sop_definitions', p_sop_definition_id, 'create_sop_run_with_due_event.sop_definition_id');
  if p_trigger_id is not null then
    perform public.assert_fk_farm(p_farm_id, 'sop_triggers', p_trigger_id, 'create_sop_run_with_due_event.trigger_id');
  end if;
  if p_assignment_id is not null then
    perform public.assert_fk_farm(p_farm_id, 'sop_assignments', p_assignment_id, 'create_sop_run_with_due_event.assignment_id');
  end if;
  if p_scope_id is not null then
    perform public.assert_fk_farm(p_farm_id, 'scopes', p_scope_id, 'create_sop_run_with_due_event.scope_id');
  end if;
  if p_source_event_id is not null then
    perform public.assert_fk_farm(p_farm_id, 'events', p_source_event_id, 'create_sop_run_with_due_event.source_event_id');
  end if;

  v_prio := coalesce(nullif(trim(p_priority), ''), 'normal');
  if v_prio not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid sop run priority';
  end if;

  insert into public.sop_runs (
    farm_id,
    sop_definition_id,
    trigger_id,
    assignment_id,
    cycle_id,
    scope_id,
    anchor_date,
    due_at,
    due_window_start,
    due_window_end,
    status,
    priority,
    reason_text,
    trigger_snapshot,
    source_event_id
  )
  values (
    p_farm_id,
    p_sop_definition_id,
    p_trigger_id,
    p_assignment_id,
    p_cycle_id,
    p_scope_id,
    p_anchor_date,
    p_due_at,
    p_due_window_start,
    p_due_window_end,
    'open',
    v_prio,
    p_reason_text,
    coalesce(p_trigger_snapshot, '{}'::jsonb),
    p_source_event_id
  )
  returning id into v_run_id;

  insert into public.events (
    farm_id,
    cycle_id,
    scope_id,
    event_type,
    title,
    body,
    occurred_at,
    source_type,
    payload,
    created_by
  )
  values (
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    'sop_due',
    'SOP due',
    coalesce(p_reason_text, 'Scheduled SOP obligation created'),
    now(),
    'internal_system',
    jsonb_build_object(
      'sop_run_id', v_run_id,
      'sop_definition_id', p_sop_definition_id,
      'trigger_id', p_trigger_id,
      'assignment_id', p_assignment_id,
      'anchor_date', p_anchor_date
    ),
    auth.uid()
  )
  returning id into v_event_id;

  update public.sop_runs
  set related_event_id = v_event_id
  where id = v_run_id;

  perform public.enqueue_standard_event_jobs(
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    v_event_id,
    now()
  );

  return v_run_id;
end;
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

    perform public.enqueue_standard_event_jobs(
      p_farm_id,
      p_cycle_id,
      p_scope_id,
      v_event.id,
      coalesce(p_harvested_at, now())
    );
  end if;

  return jsonb_build_object('harvest', to_jsonb(v_harvest), 'event', to_jsonb(v_event));
end;
$$;
