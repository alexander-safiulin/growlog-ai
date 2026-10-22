-- Minimal create_log_entry + assert_fk_farm for PGlite nutrient integration tests.

create or replace function public.assert_fk_farm(
  p_farm_id uuid,
  p_table text,
  p_row_id uuid,
  p_context text default ''
)
returns void
language plpgsql
as $$
declare
  v_farm uuid;
begin
  if p_row_id is null then
    return;
  end if;
  if p_table = 'grow_cycles' then
    select farm_id into v_farm from public.grow_cycles where id = p_row_id;
  elsif p_table = 'scopes' then
    select farm_id into v_farm from public.scopes where id = p_row_id;
  elsif p_table = 'events' then
    select farm_id into v_farm from public.events where id = p_row_id;
  elsif p_table = 'nutrient_recipes' then
    select farm_id into v_farm from public.nutrient_recipes where id = p_row_id;
  else
    return;
  end if;
  if v_farm is null or v_farm <> p_farm_id then
    raise exception 'assert_fk_farm failed for % (%)', p_table, p_context;
  end if;
end;
$$;

create or replace function public.create_log_entry(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_event_type text,
  p_body text,
  p_occurred_at timestamptz,
  p_source_type text,
  p_payload jsonb default '{}'::jsonb,
  p_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;
  perform public.assert_fk_farm(p_farm_id, 'grow_cycles', p_cycle_id, 'create_log_entry.cycle_id');
  perform public.assert_fk_farm(p_farm_id, 'scopes', p_scope_id, 'create_log_entry.scope_id');

  insert into public.events (
    farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload, created_by
  )
  values (
    p_farm_id, p_cycle_id, p_scope_id, p_event_type,
    nullif(trim(p_title), ''), nullif(trim(p_body), ''),
    p_occurred_at, p_source_type, coalesce(p_payload, '{}'::jsonb), auth.uid()
  )
  returning * into v_event;

  return jsonb_build_object('event', to_jsonb(v_event), 'jobs', '[]'::jsonb);
end;
$$;

grant execute on function public.create_log_entry(uuid, uuid, uuid, text, text, timestamptz, text, jsonb, text) to authenticated;
