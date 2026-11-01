-- Trimming runs parallel to drying/curing (metadata flag), not as a linear stage swap.

update public.grow_cycles
set
  stage = 'drying',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('trimming_active', true)
where stage = 'trimming';

create or replace function public.set_grow_cycle_trimming(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_active boolean,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.grow_cycles;
  v_event public.events;
  v_stage text;
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

  if not exists (
    select 1 from public.scopes s
    where s.id = p_scope_id and s.farm_id = p_farm_id and s.cycle_id = p_cycle_id
  ) then
    raise exception 'grow_cycle_stage: scope_id must belong to cycle';
  end if;

  v_stage := v_cycle.stage;
  if v_stage = 'trimming' then
    v_stage := 'drying';
  end if;

  if v_stage not in ('drying', 'curing') then
    raise exception 'grow_cycle_trimming: allowed only during drying or curing';
  end if;

  update public.grow_cycles
  set
    stage = case when v_cycle.stage = 'trimming' then 'drying' else v_cycle.stage end,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'trimming_active', coalesce(p_active, false),
        'trimming_updated_at', coalesce(p_occurred_at, now())
      ),
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
    'action_taken',
    case when coalesce(p_active, false) then 'Тримминг начат' else 'Тримминг завершён' end,
    coalesce(p_occurred_at, now()),
    'user_form',
    jsonb_build_object(
      'procedure', true,
      'procedure_kind', 'trimming',
      'trimming_active', coalesce(p_active, false),
      'cycle_stage', v_stage
    ),
    auth.uid()
  )
  returning * into v_event;

  return jsonb_build_object('cycle', to_jsonb(v_cycle), 'event', to_jsonb(v_event));
end;
$$;

revoke all on function public.set_grow_cycle_trimming(uuid, uuid, uuid, boolean, timestamptz) from public;
revoke all on function public.set_grow_cycle_trimming(uuid, uuid, uuid, boolean, timestamptz) from anon;
grant execute on function public.set_grow_cycle_trimming(uuid, uuid, uuid, boolean, timestamptz) to authenticated;
