-- ADR-016: persist unparsed SOP schedules and commit an import in one transaction.

alter table public.sop_definitions
  add column if not exists schedule_unparsed jsonb not null default '[]'::jsonb;

alter table public.sop_definitions
  drop constraint if exists sop_definitions_schedule_unparsed_array;

alter table public.sop_definitions
  add constraint sop_definitions_schedule_unparsed_array
  check (jsonb_typeof(schedule_unparsed) = 'array');

comment on column public.sop_definitions.schedule_unparsed is
  'ADR-016 notes for schedule text that was not stored as an active trigger.';

create or replace function public.sop_import_normalize_local_time(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := btrim(p_text);
  v_parts text[];
  v_h int;
  v_m int;
  v_s int := 0;
begin
  if v is null or v !~ '^\d{1,2}:\d{2}(:\d{2})?$' then
    return null;
  end if;
  v_parts := string_to_array(v, ':');
  v_h := v_parts[1]::int;
  v_m := v_parts[2]::int;
  if array_length(v_parts, 1) = 3 then
    v_s := v_parts[3]::int;
  end if;
  if v_h < 0 or v_h > 23 or v_m < 0 or v_m > 59 or v_s < 0 or v_s > 59 then
    return null;
  end if;
  return lpad(v_h::text, 2, '0') || ':' || lpad(v_m::text, 2, '0') || ':' || lpad(v_s::text, 2, '0');
end;
$$;

create or replace function public.sop_import_iso_date(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := left(btrim(coalesce(p_text, '')), 10);
begin
  if v !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  begin
    if to_char(v::date, 'YYYY-MM-DD') <> v then
      return null;
    end if;
  exception when others then
    return null;
  end;
  return v;
end;
$$;

create or replace function public.sop_import_trigger_config(p_type text, p_cfg jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_cfg jsonb := coalesce(p_cfg, '{}'::jsonb);
  v_out jsonb := '{}'::jsonb;
  v_time text;
  v_window text;
  v_dates jsonb := '[]'::jsonb;
  v_stages jsonb := '[]'::jsonb;
  v_item jsonb;
  v_text text;
  v_days int;
  v_list jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(v_cfg) is distinct from 'object' then
    raise exception 'trigger_config_must_be_object';
  end if;

  if p_type is null or p_type not in (
    'recurring_daily', 'recurring_interval', 'date_based', 'stage_based', 'offset_based', 'time_based'
  ) then
    raise exception 'invalid_trigger_type';
  end if;

  if v_cfg ? 'local_time' and jsonb_typeof(v_cfg->'local_time') is distinct from 'null' then
    if jsonb_typeof(v_cfg->'local_time') is distinct from 'string' then
      raise exception 'invalid_local_time';
    end if;
    v_time := public.sop_import_normalize_local_time(v_cfg->>'local_time');
    if v_time is null then
      raise exception 'invalid_local_time';
    end if;
    v_out := v_out || jsonb_build_object('local_time', v_time);
  elsif p_type = 'time_based' then
    raise exception 'invalid_local_time';
  end if;

  v_window := null;
  if v_cfg ? 'window_end_local' and jsonb_typeof(v_cfg->'window_end_local') is distinct from 'null' then
    if jsonb_typeof(v_cfg->'window_end_local') is distinct from 'string' then
      raise exception 'invalid_window_end';
    end if;
    v_window := public.sop_import_normalize_local_time(v_cfg->>'window_end_local');
    if v_window is null then
      raise exception 'invalid_window_end';
    end if;
  elsif v_cfg ? 'window_end' and jsonb_typeof(v_cfg->'window_end') is distinct from 'null' then
    if jsonb_typeof(v_cfg->'window_end') is distinct from 'string' then
      raise exception 'invalid_window_end';
    end if;
    v_window := public.sop_import_normalize_local_time(v_cfg->>'window_end');
    if v_window is null then
      raise exception 'invalid_window_end';
    end if;
  end if;
  if v_window is not null then
    v_out := v_out || jsonb_build_object('window_end_local', v_window);
  end if;

  if p_type = 'recurring_interval' then
    v_text := v_cfg->>'interval_days';
    if v_text is null or v_text !~ '^[0-9]+$' then
      raise exception 'invalid_interval_days';
    end if;
    begin
      v_days := v_text::int;
    exception when others then
      raise exception 'invalid_interval_days';
    end;
    if v_days < 1 then
      raise exception 'invalid_interval_days';
    end if;
    v_out := v_out || jsonb_build_object('interval_days', v_days);
  elsif p_type = 'date_based' then
    if jsonb_typeof(v_cfg->'dates') = 'array' then
      for v_item in select value from jsonb_array_elements(v_cfg->'dates')
      loop
        if jsonb_typeof(v_item) = 'string' then
          v_text := public.sop_import_iso_date(v_item #>> '{}');
          if v_text is not null and jsonb_array_length(v_dates) < 100 then
            v_dates := v_dates || jsonb_build_array(v_text);
          end if;
        end if;
      end loop;
    elsif jsonb_typeof(v_cfg->'date') = 'string' then
      v_text := public.sop_import_iso_date(v_cfg->>'date');
      if v_text is not null then
        v_dates := jsonb_build_array(v_text);
      end if;
    end if;
    if jsonb_array_length(v_dates) = 0 then
      raise exception 'missing_dates';
    end if;
    v_out := v_out || jsonb_build_object('dates', v_dates);
    if jsonb_typeof(v_cfg->'label') = 'string' and length(btrim(v_cfg->>'label')) > 0 then
      v_out := v_out || jsonb_build_object('label', left(btrim(v_cfg->>'label'), 200));
    end if;
  elsif p_type = 'stage_based' then
    if jsonb_typeof(v_cfg->'stages') = 'array' then
      for v_item in select value from jsonb_array_elements(v_cfg->'stages')
      loop
        if jsonb_typeof(v_item) = 'string' then
          v_text := left(btrim(v_item #>> '{}'), 64);
          if v_text <> '' and jsonb_array_length(v_stages) < 20 then
            v_stages := v_stages || jsonb_build_array(v_text);
          end if;
        end if;
      end loop;
    elsif jsonb_typeof(v_cfg->'stage') = 'string' then
      v_text := left(btrim(v_cfg->>'stage'), 64);
      if v_text <> '' then
        v_stages := jsonb_build_array(v_text);
      end if;
    end if;
    if jsonb_array_length(v_stages) = 0 then
      raise exception 'missing_stages';
    end if;
    v_out := v_out || jsonb_build_object('stages', v_stages);
  elsif p_type = 'offset_based' then
    v_text := null;
    if v_cfg ? 'offset_days' and jsonb_typeof(v_cfg->'offset_days') is distinct from 'null' then
      v_text := v_cfg->>'offset_days';
    elsif jsonb_typeof(v_cfg->'days_after_cycle_start') = 'number' then
      v_text := v_cfg->>'days_after_cycle_start';
    end if;
    if v_text is null or v_text !~ '^[0-9]+$' then
      raise exception 'invalid_offset_days';
    end if;
    begin
      v_days := v_text::int;
    exception when others then
      raise exception 'invalid_offset_days';
    end;
    v_out := v_out || jsonb_build_object('offset_days', v_days);
  elsif p_type not in ('recurring_daily', 'time_based') then
    raise exception 'unsupported_trigger_type';
  end if;

  if p_type = 'recurring_daily' and v_cfg ? 'weekdays' and jsonb_typeof(v_cfg->'weekdays') is distinct from 'null' then
    if jsonb_typeof(v_cfg->'weekdays') is distinct from 'array' then
      raise exception 'invalid_weekdays';
    end if;
    v_list := '[]'::jsonb;
    for v_item in select value from jsonb_array_elements(v_cfg->'weekdays')
    loop
      if jsonb_typeof(v_item) = 'number' and (v_item #>> '{}') ~ '^[0-9]+$' then
        v_days := (v_item #>> '{}')::int;
        if v_days between 1 and 7 and not v_list @> jsonb_build_array(v_days) then
          v_list := v_list || jsonb_build_array(v_days);
        end if;
      end if;
    end loop;
    if jsonb_array_length(v_list) = 0 then
      raise exception 'invalid_weekdays';
    end if;
    v_out := v_out || jsonb_build_object('weekdays', v_list);
  end if;

  if p_type = 'recurring_daily' and v_cfg ? 'month_days' and jsonb_typeof(v_cfg->'month_days') is distinct from 'null' then
    if jsonb_typeof(v_cfg->'month_days') is distinct from 'array' then
      raise exception 'invalid_month_days';
    end if;
    v_list := '[]'::jsonb;
    for v_item in select value from jsonb_array_elements(v_cfg->'month_days')
    loop
      if jsonb_typeof(v_item) = 'number' and (v_item #>> '{}') ~ '^[0-9]+$' then
        v_days := (v_item #>> '{}')::int;
        if v_days between 1 and 31 and not v_list @> jsonb_build_array(v_days) then
          v_list := v_list || jsonb_build_array(v_days);
        end if;
      end if;
    end loop;
    if jsonb_array_length(v_list) = 0 then
      raise exception 'invalid_month_days';
    end if;
    v_out := v_out || jsonb_build_object('month_days', v_list);
  end if;

  if p_type = 'stage_based' and v_cfg ? 'when' and jsonb_typeof(v_cfg->'when') is distinct from 'null' then
    if v_cfg->>'when' not in ('enter', 'exit', 'during') then
      raise exception 'invalid_stage_when';
    end if;
    if v_cfg->>'when' <> 'during' then
      v_out := v_out || jsonb_build_object('when', v_cfg->>'when');
    end if;
  end if;

  return v_out;
end;
$$;

create or replace function public.commit_sop_document_import(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_source_text text,
  p_source_title text,
  p_content_hash text,
  p_allow_duplicate boolean,
  p_drafts jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc_id uuid;
  v_def_id uuid;
  v_draft jsonb;
  v_item jsonb;
  v_title text;
  v_description text;
  v_category text;
  v_criticality text;
  v_severity text;
  v_scope text;
  v_steps jsonb := '[]'::jsonb;
  v_inputs jsonb := '[]'::jsonb;
  v_notes jsonb := '[]'::jsonb;
  v_text text;
  v_trigger_count int;
  v_cfg jsonb;
  v_created jsonb := '[]'::jsonb;
  v_hash text := nullif(btrim(coalesce(p_content_hash, '')), '');
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'farm_not_found';
  end if;

  if p_source_text is null or length(btrim(p_source_text)) < 40 then
    raise exception 'source_text_too_short';
  end if;

  if not exists (
    select 1 from public.grow_cycles
    where id = p_cycle_id and farm_id = p_farm_id
  ) then
    raise exception 'cycle_not_found';
  end if;

  if not exists (
    select 1 from public.scopes
    where id = p_scope_id and farm_id = p_farm_id
  ) then
    raise exception 'invalid_scope';
  end if;

  if exists (
    select 1 from public.scopes
    where id = p_scope_id
      and farm_id = p_farm_id
      and cycle_id is not null
      and cycle_id <> p_cycle_id
  ) then
    raise exception 'cycle_scope_mismatch';
  end if;

  if jsonb_typeof(p_drafts) is distinct from 'array' or jsonb_array_length(p_drafts) < 1 then
    raise exception 'no_drafts';
  end if;
  if jsonb_array_length(p_drafts) > 25 then
    raise exception 'validation_error';
  end if;

  if not coalesce(p_allow_duplicate, false) and v_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_farm_id::text || ':sop-import:' || v_hash, 0));
    if exists (
      select 1 from public.sop_documents
      where farm_id = p_farm_id
        and metadata->>'content_hash' = v_hash
    ) then
      raise exception 'duplicate_document';
    end if;
  end if;

  insert into public.sop_documents (
    farm_id, title, status, parsed_text, created_by, metadata
  ) values (
    p_farm_id,
    coalesce(nullif(left(btrim(coalesce(p_source_title, '')), 200), ''), 'Imported SOP document'),
    'active',
    left(p_source_text, 500000),
    auth.uid(),
    jsonb_build_object('intake', 'adr-016', 'content_hash', v_hash)
  )
  returning id into v_doc_id;

  for v_draft in select value from jsonb_array_elements(p_drafts)
  loop
    if jsonb_typeof(v_draft) is distinct from 'object' then
      raise exception 'validation_error';
    end if;

    v_title := left(btrim(coalesce(v_draft->>'title', '')), 200);
    if v_title = '' then
      raise exception 'validation_error';
    end if;

    v_scope := v_draft->>'applies_to_scope';
    if v_scope is null or v_scope not in (
      'farm', 'site', 'room', 'tent', 'zone', 'bed', 'reservoir', 'plant_group', 'plant'
    ) then
      raise exception 'missing_applies_to_scope';
    end if;

    v_criticality := v_draft->>'criticality';
    if v_criticality is null or v_criticality not in ('low', 'normal', 'high', 'critical') then
      v_criticality := 'normal';
    end if;
    v_severity := v_draft->>'severity_if_missed';
    if v_severity is null or v_severity not in ('low', 'normal', 'high', 'critical') then
      v_severity := 'normal';
    end if;

    v_description := nullif(left(btrim(coalesce(v_draft->>'description', '')), 4000), '');
    v_category := nullif(left(btrim(coalesce(v_draft->>'category', '')), 64), '');

    v_steps := '[]'::jsonb;
    if jsonb_typeof(v_draft->'steps') is distinct from 'array' then
      raise exception 'validation_error';
    end if;
    for v_item in select value from jsonb_array_elements(v_draft->'steps')
    loop
      if jsonb_typeof(v_item) = 'string' then
        v_text := btrim(v_item #>> '{}');
        if v_text <> '' and jsonb_array_length(v_steps) < 80 then
          v_steps := v_steps || jsonb_build_array(v_text);
        end if;
      end if;
    end loop;
    if jsonb_array_length(v_steps) = 0 then
      raise exception 'validation_error';
    end if;

    v_inputs := '[]'::jsonb;
    if jsonb_typeof(v_draft->'required_inputs_after_execution') = 'array' then
      for v_item in select value from jsonb_array_elements(v_draft->'required_inputs_after_execution')
      loop
        if jsonb_typeof(v_item) = 'string' then
          v_text := left(btrim(v_item #>> '{}'), 64);
          if v_text <> '' and jsonb_array_length(v_inputs) < 30 then
            v_inputs := v_inputs || jsonb_build_array(v_text);
          end if;
        end if;
      end loop;
    end if;

    v_notes := '[]'::jsonb;
    if jsonb_typeof(v_draft->'schedule_unparsed') = 'array' then
      for v_item in select value from jsonb_array_elements(v_draft->'schedule_unparsed')
      loop
        if jsonb_typeof(v_item) = 'string' then
          v_text := left(btrim(v_item #>> '{}'), 500);
          if v_text <> '' and jsonb_array_length(v_notes) < 10 then
            v_notes := v_notes || jsonb_build_array(v_text);
          end if;
        end if;
      end loop;
    end if;

    if v_draft ? 'triggers'
      and jsonb_typeof(v_draft->'triggers') is distinct from 'array'
      and jsonb_typeof(v_draft->'triggers') is distinct from 'null' then
      raise exception 'validation_error';
    end if;
    if jsonb_typeof(v_draft->'triggers') = 'array' and jsonb_array_length(v_draft->'triggers') > 12 then
      raise exception 'validation_error';
    end if;

    insert into public.sop_definitions (
      farm_id,
      document_id,
      title,
      description,
      category,
      criticality,
      applies_to_scope,
      severity_if_missed,
      instructions_json,
      required_inputs_after_execution,
      schedule_unparsed,
      active
    ) values (
      p_farm_id,
      v_doc_id,
      v_title,
      v_description,
      v_category,
      v_criticality,
      v_scope,
      v_severity,
      jsonb_build_object('steps', v_steps),
      v_inputs,
      v_notes,
      true
    )
    returning id into v_def_id;

    v_trigger_count := 0;
    if jsonb_typeof(v_draft->'triggers') = 'array' then
      for v_item in select value from jsonb_array_elements(v_draft->'triggers')
      loop
        if jsonb_typeof(v_item) is distinct from 'object' then
          raise exception 'validation_error';
        end if;
        v_cfg := public.sop_import_trigger_config(
          v_item->>'trigger_type',
          coalesce(v_item->'trigger_config', '{}'::jsonb)
        );
        insert into public.sop_triggers (
          farm_id, sop_definition_id, trigger_type, trigger_config, active
        ) values (
          p_farm_id, v_def_id, v_item->>'trigger_type', v_cfg, true
        );
        v_trigger_count := v_trigger_count + 1;
      end loop;
    end if;

    insert into public.sop_assignments (
      farm_id, sop_definition_id, cycle_id, scope_id, assignment_status
    ) values (
      p_farm_id, v_def_id, p_cycle_id, p_scope_id, 'active'
    );

    perform public.enqueue_background_job(
      'document.index',
      p_farm_id,
      'normal',
      p_cycle_id,
      p_scope_id,
      'sop_definition',
      v_def_id,
      now(),
      'document.index:sop_definition:' || v_def_id::text,
      v_def_id::text,
      jsonb_build_object('doc_type', 'sop_definition', 'source_id', v_def_id)
    );

    v_created := v_created || jsonb_build_array(
      jsonb_build_object(
        'definitionId', v_def_id,
        'title', v_title,
        'triggerCount', v_trigger_count
      )
    );
  end loop;

  return jsonb_build_object('documentId', v_doc_id, 'created', v_created);
end;
$$;

revoke all on function public.sop_import_normalize_local_time(text) from public, anon;
revoke all on function public.sop_import_iso_date(text) from public, anon;
revoke all on function public.sop_import_trigger_config(text, jsonb) from public, anon;
revoke all on function public.commit_sop_document_import(uuid, uuid, uuid, text, text, text, boolean, jsonb) from public, anon;

grant execute on function public.sop_import_normalize_local_time(text) to authenticated, service_role;
grant execute on function public.sop_import_iso_date(text) to authenticated, service_role;
grant execute on function public.sop_import_trigger_config(text, jsonb) to authenticated, service_role;
grant execute on function public.commit_sop_document_import(uuid, uuid, uuid, text, text, text, boolean, jsonb) to authenticated, service_role;
