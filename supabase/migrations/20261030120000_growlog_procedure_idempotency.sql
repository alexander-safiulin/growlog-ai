-- A procedure save that is retried (hung request, double tap, worker not draining jobs)
-- must return the event already written. Jobs stay deduped; the raw insert was not.
-- Photo attachments stay photo_capture rows. The client links them; the feed hides them.

create unique index if not exists events_client_request_id_uidx
  on public.events (farm_id, (payload->>'client_request_id'))
  where coalesce(payload->>'client_request_id', '') <> '';

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
  v_jobs jsonb;
  v_client_request_id text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  perform public.assert_fk_farm(p_farm_id, 'grow_cycles', p_cycle_id, 'create_log_entry.cycle_id');
  perform public.assert_fk_farm(p_farm_id, 'scopes', p_scope_id, 'create_log_entry.scope_id');

  v_client_request_id := nullif(trim(coalesce(p_payload->>'client_request_id', '')), '');

  if v_client_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_farm_id::text || ':client:' || v_client_request_id, 0));
    select * into v_event
    from public.events
    where farm_id = p_farm_id
      and payload->>'client_request_id' = v_client_request_id
    order by created_at
    limit 1;
    if found then
      return jsonb_build_object('event', to_jsonb(v_event), 'jobs', '{}'::jsonb);
    end if;
  end if;

  if p_event_type = 'action_taken'
     and coalesce(p_payload, '{}'::jsonb) @> '{"procedure": true}'::jsonb then
    perform pg_advisory_xact_lock(hashtextextended(
      p_farm_id::text || ':procedure:' || p_scope_id::text || ':' || p_occurred_at::text || ':' || coalesce(nullif(trim(p_body), ''), ''),
      0
    ));
    select * into v_event
    from public.events
    where farm_id = p_farm_id
      and cycle_id = p_cycle_id
      and scope_id = p_scope_id
      and event_type = 'action_taken'
      and created_by = auth.uid()
      and occurred_at = p_occurred_at
      and body is not distinct from nullif(trim(p_body), '')
      and coalesce(payload, '{}'::jsonb) @> '{"procedure": true}'::jsonb
      and created_at > now() - interval '60 minutes'
    order by created_at
    limit 1;
    if found then
      return jsonb_build_object('event', to_jsonb(v_event), 'jobs', '{}'::jsonb);
    end if;
  end if;

  begin
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
      p_event_type,
      nullif(trim(p_title), ''),
      nullif(trim(p_body), ''),
      p_occurred_at,
      p_source_type,
      coalesce(p_payload, '{}'::jsonb),
      auth.uid()
    )
    returning * into v_event;
  exception
    when unique_violation then
      if v_client_request_id is null then
        raise;
      end if;
      select * into v_event
      from public.events
      where farm_id = p_farm_id
        and payload->>'client_request_id' = v_client_request_id
      order by created_at
      limit 1;
      if not found then
        raise;
      end if;
      return jsonb_build_object('event', to_jsonb(v_event), 'jobs', '{}'::jsonb);
  end;

  v_jobs := public.enqueue_standard_event_jobs(
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    v_event.id,
    p_occurred_at
  );

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'jobs', v_jobs
  );
end;
$$;
