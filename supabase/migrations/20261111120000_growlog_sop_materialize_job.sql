-- Enqueue sop.materialize when a stage_changed event is recorded (ADR-006 + ADR-008).

create or replace function public.enqueue_standard_event_jobs(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_event_id uuid,
  p_occurred_at timestamptz,
  p_priority text default 'normal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timeline_job_id uuid;
  v_doc_job_id uuid;
  v_focus_job_id uuid;
  v_sop_job_id uuid;
  v_local_date date;
  v_event_type text;
begin
  v_local_date := public.farm_local_date(p_farm_id, p_occurred_at);

  select e.event_type into v_event_type
  from public.events e
  where e.id = p_event_id;

  v_doc_job_id := public.enqueue_background_job(
    'document.index',
    p_farm_id,
    p_priority,
    p_cycle_id,
    p_scope_id,
    'event',
    p_event_id,
    now(),
    format('document.index:event:%s', p_event_id),
    p_event_id::text,
    jsonb_build_object('doc_type', 'event', 'source_id', p_event_id)
  );

  v_timeline_job_id := public.enqueue_background_job(
    'timeline.daily.refresh',
    p_farm_id,
    p_priority,
    p_cycle_id,
    p_scope_id,
    'event',
    p_event_id,
    now(),
    format('timeline.daily.refresh:%s:%s', p_scope_id, v_local_date),
    p_event_id::text,
    jsonb_build_object('timeline_date', v_local_date, 'event_id', p_event_id)
  );

  v_focus_job_id := public.enqueue_background_job(
    'focus.refresh',
    p_farm_id,
    p_priority,
    p_cycle_id,
    p_scope_id,
    'event',
    p_event_id,
    now(),
    format('focus.refresh:%s:%s', p_scope_id, v_local_date),
    p_event_id::text,
    jsonb_build_object('focus_date', v_local_date, 'event_id', p_event_id)
  );

  v_sop_job_id := null;
  if v_event_type = 'stage_changed' and p_cycle_id is not null then
    v_sop_job_id := public.enqueue_background_job(
      'sop.materialize',
      p_farm_id,
      'high',
      p_cycle_id,
      p_scope_id,
      'event',
      p_event_id,
      now(),
      format('sop.materialize:%s:%s', p_cycle_id, v_local_date),
      p_event_id::text,
      jsonb_build_object('anchor_date', v_local_date, 'event_id', p_event_id)
    );
  end if;

  return jsonb_build_object(
    'document_index_job_id', v_doc_job_id,
    'timeline_refresh_job_id', v_timeline_job_id,
    'focus_refresh_job_id', v_focus_job_id,
    'sop_materialize_job_id', v_sop_job_id
  );
end;
$$;

comment on function public.enqueue_standard_event_jobs(uuid, uuid, uuid, uuid, timestamptz, text) is
  'ADR-008: derived jobs for an event; stage_changed also enqueues sop.materialize for that farm-local day.';
