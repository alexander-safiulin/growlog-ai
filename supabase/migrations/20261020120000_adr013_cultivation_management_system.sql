-- ADR-013: Cultivation Management System (electronic grower, GACP-oriented extensions)

create extension if not exists vector;

-- SOP revisions (append-only change log)
create table if not exists public.sop_revisions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  sop_definition_id uuid not null references public.sop_definitions(id) on delete cascade,
  version integer not null check (version >= 1),
  title text not null,
  body_json jsonb not null default '{}'::jsonb,
  instructions_json jsonb not null default '[]'::jsonb,
  reason text not null,
  proposed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  effective_from timestamptz not null default now(),
  supersedes_id uuid references public.sop_revisions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now()
);

create unique index if not exists sop_revisions_def_version
  on public.sop_revisions (sop_definition_id, version);

create index if not exists sop_revisions_farm_def
  on public.sop_revisions (farm_id, sop_definition_id, effective_from desc);

alter table public.sop_revisions enable row level security;
drop policy if exists sop_revisions_all on public.sop_revisions;
create policy sop_revisions_all on public.sop_revisions for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

alter table public.sop_definitions
  add column if not exists current_revision_id uuid references public.sop_revisions(id) on delete set null;

-- Knowledge playbook approval
alter table public.knowledge_items
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'approved', 'retired'));

alter table public.knowledge_items
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.knowledge_items
  add column if not exists approved_at timestamptz;

alter table public.knowledge_items
  add column if not exists source_media_asset_id uuid references public.media_assets(id) on delete set null;

-- Structured playbook thresholds (deterministic checks)
create table if not exists public.playbook_thresholds (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_stage text check (cycle_stage in ('propagation', 'veg', 'flower', 'drying', 'curing', 'completed')),
  metric_code text not null,
  min_value numeric,
  max_value numeric,
  unit text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  knowledge_item_id uuid references public.knowledge_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger playbook_thresholds_updated_at
  before update on public.playbook_thresholds
  for each row execute function public.set_updated_at();

alter table public.playbook_thresholds enable row level security;
drop policy if exists playbook_thresholds_all on public.playbook_thresholds;
create policy playbook_thresholds_all on public.playbook_thresholds for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

-- Master Grower interview sessions
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  stage text not null check (stage in ('propagation', 'veg', 'flower', 'harvest', 'drying', 'curing', 'general')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'archived')),
  conducted_by uuid references auth.users(id) on delete set null,
  answers_json jsonb not null default '[]'::jsonb,
  draft_knowledge_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger interview_sessions_updated_at
  before update on public.interview_sessions
  for each row execute function public.set_updated_at();

alter table public.interview_sessions enable row level security;
drop policy if exists interview_sessions_all on public.interview_sessions;
create policy interview_sessions_all on public.interview_sessions for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

-- Cycle stage calendar plan
create table if not exists public.cycle_stage_plan (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid not null references public.grow_cycles(id) on delete cascade,
  stage text not null,
  planned_start date,
  planned_end date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, stage)
);

create trigger cycle_stage_plan_updated_at
  before update on public.cycle_stage_plan
  for each row execute function public.set_updated_at();

alter table public.cycle_stage_plan enable row level security;
drop policy if exists cycle_stage_plan_all on public.cycle_stage_plan;
create policy cycle_stage_plan_all on public.cycle_stage_plan for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

-- Deviations & CAPA
create table if not exists public.deviations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid references public.grow_cycles(id) on delete set null,
  scope_id uuid references public.scopes(id) on delete set null,
  source_event_id uuid references public.events(id) on delete set null,
  sop_revision_id uuid references public.sop_revisions(id) on delete set null,
  sop_run_id uuid references public.sop_runs(id) on delete set null,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'corrective_action', 'closed')),
  root_cause text,
  corrective_action text,
  preventive_action text,
  detected_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deviations_farm_status on public.deviations (farm_id, status, detected_at desc);

create trigger deviations_updated_at
  before update on public.deviations
  for each row execute function public.set_updated_at();

alter table public.deviations enable row level security;
drop policy if exists deviations_all on public.deviations;
create policy deviations_all on public.deviations for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

-- Grow memory approval for lessons
alter table public.grow_memory_items
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'approved', 'retired'));

-- Rows that existed before ADR-013 stay canonical. Later inserts stay drafts until approval.
update public.knowledge_items set status = 'approved' where status = 'draft';
update public.grow_memory_items set status = 'approved' where status = 'draft';

-- GACP traceability
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  material_type text not null default 'other' check (material_type in ('fertilizer', 'pesticide', 'substrate', 'other')),
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger materials_updated_at before update on public.materials for each row execute function public.set_updated_at();

alter table public.materials enable row level security;
drop policy if exists materials_all on public.materials;
create policy materials_all on public.materials for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

create table if not exists public.material_lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  lot_code text not null,
  received_at date,
  expires_at date,
  quantity numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (material_id, lot_code)
);

alter table public.material_lots enable row level security;
drop policy if exists material_lots_all on public.material_lots;
create policy material_lots_all on public.material_lots for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

create table if not exists public.harvest_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid not null references public.grow_cycles(id) on delete cascade,
  scope_id uuid references public.scopes(id) on delete set null,
  harvested_at timestamptz not null default now(),
  wet_weight_kg numeric,
  dry_weight_kg numeric,
  notes text,
  event_id uuid references public.events(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.harvest_records enable row level security;
drop policy if exists harvest_records_all on public.harvest_records;
create policy harvest_records_all on public.harvest_records for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

create table if not exists public.qc_results (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid references public.grow_cycles(id) on delete set null,
  batch_code text,
  lab_name text,
  test_type text not null,
  result_json jsonb not null default '{}'::jsonb,
  passed boolean,
  tested_at timestamptz not null default now(),
  document_media_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.qc_results enable row level security;
drop policy if exists qc_results_all on public.qc_results;
create policy qc_results_all on public.qc_results for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  zone_id uuid references public.farm_zones(id) on delete set null,
  name text not null,
  equipment_type text not null default 'other',
  status text not null default 'active' check (status in ('active', 'maintenance', 'retired')),
  last_service_at timestamptz,
  next_service_due timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger equipment_updated_at before update on public.equipment for each row execute function public.set_updated_at();

alter table public.equipment enable row level security;
drop policy if exists equipment_all on public.equipment;
create policy equipment_all on public.equipment for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

create table if not exists public.training_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sop_revision_id uuid references public.sop_revisions(id) on delete set null,
  knowledge_item_id uuid references public.knowledge_items(id) on delete set null,
  acknowledged_at timestamptz not null default now(),
  notes text,
  unique (farm_id, user_id, sop_revision_id)
);

alter table public.training_records enable row level security;
drop policy if exists training_records_all on public.training_records;
create policy training_records_all on public.training_records for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

-- Search: pgvector + FTS on searchable_documents
alter table public.searchable_documents
  add column if not exists embedding_vector vector(1536);

alter table public.searchable_documents
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'B')
  ) stored;

create index if not exists searchable_documents_search_vector_gin
  on public.searchable_documents using gin (search_vector);

do $$
begin
  execute 'create index if not exists searchable_documents_embedding_vector_hnsw
    on public.searchable_documents using hnsw (embedding_vector vector_cosine_ops)';
exception when others then
  raise notice 'hnsw index skipped: %', sqlerrm;
end $$;

-- Roles: owner=admin, master grower=manager. Approval is manager/admin (ADR-013).
create or replace function public.user_farm_role(p_farm_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select fu.role
  from public.farm_users fu
  where fu.farm_id = p_farm_id and fu.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.user_can_approve_farm(p_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_farm_role(p_farm_id) in ('admin', 'manager');
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->>'role', '') = 'service_role';
$$;

grant execute on function public.user_farm_role(uuid) to authenticated;
grant execute on function public.user_can_approve_farm(uuid) to authenticated;
grant execute on function public.is_service_role() to authenticated, service_role;

create or replace function public.enforce_cms_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'sop_revisions' and TG_OP = 'UPDATE' and OLD.status = 'approved' then
    if NEW.body_json is distinct from OLD.body_json
       or NEW.instructions_json is distinct from OLD.instructions_json
       or NEW.title is distinct from OLD.title
       or NEW.reason is distinct from OLD.reason
       or NEW.version is distinct from OLD.version
       or NEW.sop_definition_id is distinct from OLD.sop_definition_id
    then
      raise exception 'sop_revision_append_only';
    end if;
  end if;

  if TG_TABLE_NAME in ('sop_revisions', 'knowledge_items', 'grow_memory_items', 'playbook_thresholds') then
    if (TG_OP = 'INSERT' and NEW.status = 'approved')
       or (TG_OP = 'UPDATE' and NEW.status = 'approved' and OLD.status is distinct from 'approved') then
      if not public.is_service_role() and not coalesce(public.user_can_approve_farm(NEW.farm_id), false) then
        raise exception 'approver_required';
      end if;
    end if;
  end if;

  if TG_TABLE_NAME = 'sop_revision_translations' then
    if (TG_OP = 'INSERT' and NEW.translation_status = 'approved')
       or (TG_OP = 'UPDATE' and NEW.translation_status = 'approved' and OLD.translation_status is distinct from 'approved') then
      if not public.is_service_role() and not coalesce(public.user_can_approve_farm(NEW.farm_id), false) then
        raise exception 'approver_required';
      end if;
    end if;
  end if;

  if TG_TABLE_NAME = 'deviations' and TG_OP = 'UPDATE'
     and NEW.status = 'closed' and OLD.status is distinct from 'closed' then
    if not public.is_service_role() and not coalesce(public.user_can_approve_farm(NEW.farm_id), false) then
      raise exception 'approver_required';
    end if;
    if NEW.closed_by is null then
      NEW.closed_by := auth.uid();
    end if;
    if NEW.closed_at is null then
      NEW.closed_at := now();
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists sop_revisions_approval on public.sop_revisions;
create trigger sop_revisions_approval
  before insert or update on public.sop_revisions
  for each row execute function public.enforce_cms_approval();

drop trigger if exists knowledge_items_approval on public.knowledge_items;
create trigger knowledge_items_approval
  before insert or update on public.knowledge_items
  for each row execute function public.enforce_cms_approval();

drop trigger if exists grow_memory_items_approval on public.grow_memory_items;
create trigger grow_memory_items_approval
  before insert or update on public.grow_memory_items
  for each row execute function public.enforce_cms_approval();

drop trigger if exists playbook_thresholds_approval on public.playbook_thresholds;
create trigger playbook_thresholds_approval
  before insert or update on public.playbook_thresholds
  for each row execute function public.enforce_cms_approval();

drop trigger if exists deviations_approval on public.deviations;
create trigger deviations_approval
  before update on public.deviations
  for each row execute function public.enforce_cms_approval();

drop policy if exists knowledge_items_write on public.knowledge_items;
create policy knowledge_items_write on public.knowledge_items for insert
  with check (
    farm_id in (select public.user_farm_ids())
    and status = 'draft'
    and public.user_farm_role(farm_id) in ('admin', 'manager', 'grower')
  );

drop policy if exists knowledge_items_update on public.knowledge_items;
create policy knowledge_items_update on public.knowledge_items for update
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

create unique index if not exists deviations_auto_source_event
  on public.deviations (source_event_id)
  where source_event_id is not null and coalesce(metadata->>'auto', '') = 'true';

-- Machine translations are derived. Canonical text stays on sop_revisions.
create table if not exists public.sop_revision_translations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  sop_revision_id uuid not null references public.sop_revisions(id) on delete cascade,
  locale text not null check (locale in ('en', 'ru', 'th', 'my')),
  title text not null,
  body_text text not null,
  translation_status text not null default 'machine' check (translation_status in ('machine', 'approved')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sop_revision_id, locale)
);

alter table public.sop_revision_translations enable row level security;
drop policy if exists sop_revision_translations_all on public.sop_revision_translations;
create policy sop_revision_translations_all on public.sop_revision_translations for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));

drop trigger if exists sop_revision_translations_approval on public.sop_revision_translations;
create trigger sop_revision_translations_approval
  before insert or update on public.sop_revision_translations
  for each row execute function public.enforce_cms_approval();

create table if not exists public.shift_handovers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid references public.grow_cycles(id) on delete set null,
  shift_date date not null,
  recorded_by uuid references auth.users(id) on delete set null,
  recorder_role text,
  manager_participated boolean not null,
  created_at timestamptz not null default now(),
  unique (farm_id, shift_date, recorded_by)
);

alter table public.shift_handovers enable row level security;
drop policy if exists shift_handovers_all on public.shift_handovers;
create policy shift_handovers_all on public.shift_handovers for all
  using (farm_id in (select public.user_farm_ids()))
  with check (
    farm_id in (select public.user_farm_ids())
    and public.user_farm_role(farm_id) in ('admin', 'manager', 'grower')
  );

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'reports'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%report_type%'
  loop
    execute format('alter table public.reports drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.reports
  add constraint reports_report_type_check
  check (report_type in ('daily', 'cycle', 'manager', 'public_html', 'pdf', 'other', 'batch_record'));

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'insight_grounding'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%source_type%'
  loop
    execute format('alter table public.insight_grounding drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.insight_grounding
  add constraint insight_grounding_source_type_check
  check (source_type in (
    'event', 'observation', 'sensor_reading', 'sop_run', 'sop_definition',
    'sop_revision', 'knowledge_item', 'media_asset', 'grow_cycle', 'scope'
  ));

create or replace function public.match_searchable_documents(
  p_farm_id uuid,
  p_query vector(1536),
  p_doc_types text[],
  p_match_count integer default 8
)
returns table (
  id uuid,
  doc_type text,
  title text,
  body text,
  cycle_id uuid,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    d.id,
    d.doc_type,
    d.title,
    d.body,
    d.cycle_id,
    d.metadata,
    (1 - (d.embedding_vector <=> p_query))::double precision as similarity
  from public.searchable_documents d
  where d.farm_id = p_farm_id
    and d.doc_type = any(p_doc_types)
    and d.embedding_vector is not null
    and coalesce(d.metadata->>'status', 'approved') = 'approved'
  order by d.embedding_vector <=> p_query
  limit greatest(coalesce(p_match_count, 8), 1);
$$;

grant execute on function public.match_searchable_documents(uuid, vector, text[], integer) to authenticated, service_role;

create or replace function public.apply_event_based_sop_triggers(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_count integer := 0;
  v_tr record;
  v_assignment_id uuid;
  v_scope uuid;
  v_run uuid;
  v_due_event uuid;
begin
  if not public.is_service_role() then
    if auth.uid() is null then
      raise exception 'Not authenticated';
    end if;
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return 0;
  end if;

  if not public.is_service_role()
     and v_event.farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  if v_event.cycle_id is null then
    return 0;
  end if;

  for v_tr in
    select t.id, t.sop_definition_id, t.trigger_config
    from public.sop_triggers t
    join public.sop_definitions d on d.id = t.sop_definition_id
    where t.active = true
      and t.trigger_type = 'event_based'
      and d.farm_id = v_event.farm_id
      and d.active = true
      and (
        coalesce(t.trigger_config->'event_types', '[]'::jsonb) ? v_event.event_type
        or t.trigger_config->>'event_type' = v_event.event_type
      )
  loop
    if exists (
      select 1 from public.sop_runs r
      where r.trigger_id = v_tr.id and r.source_event_id = v_event.id
    ) then
      continue;
    end if;

    v_assignment_id := null;
    v_scope := v_event.scope_id;
    select a.id, coalesce(v_event.scope_id, a.scope_id)
      into v_assignment_id, v_scope
    from public.sop_assignments a
    where a.sop_definition_id = v_tr.sop_definition_id
      and a.cycle_id = v_event.cycle_id
      and a.assignment_status = 'active'
    limit 1;

    insert into public.sop_runs (
      farm_id, sop_definition_id, trigger_id, assignment_id, cycle_id, scope_id,
      due_at, status, priority, reason_text, trigger_snapshot, source_event_id
    ) values (
      v_event.farm_id,
      v_tr.sop_definition_id,
      v_tr.id,
      v_assignment_id,
      v_event.cycle_id,
      v_scope,
      now(),
      'open',
      'high',
      'Event trigger ' || v_event.event_type,
      jsonb_build_object('trigger_type', 'event_based', 'event_type', v_event.event_type, 'farm_id', v_event.farm_id),
      v_event.id
    ) returning id into v_run;

    insert into public.events (
      farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload
    ) values (
      v_event.farm_id,
      v_event.cycle_id,
      v_scope,
      'sop_due',
      'SOP due',
      'Event-based SOP for ' || v_event.event_type,
      now(),
      'internal_system',
      jsonb_build_object('sop_run_id', v_run, 'source_event_id', v_event.id, 'trigger_id', v_tr.id)
    ) returning id into v_due_event;

    update public.sop_runs set related_event_id = v_due_event where id = v_run;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.apply_event_based_sop_triggers(uuid) to authenticated, service_role;

create or replace function public.create_manual_sop_run(
  p_farm_id uuid,
  p_cycle_id uuid,
  p_scope_id uuid,
  p_sop_definition_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trigger uuid;
  v_role text;
  v_anchor date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_role := public.user_farm_role(p_farm_id);
  if v_role is null or v_role = 'viewer' then
    raise exception 'role_forbidden';
  end if;

  select t.id into v_trigger
  from public.sop_triggers t
  join public.sop_definitions d on d.id = t.sop_definition_id
  where t.sop_definition_id = p_sop_definition_id
    and t.trigger_type = 'manual'
    and t.active = true
    and d.farm_id = p_farm_id
    and d.active = true
  limit 1;

  v_anchor := public.farm_local_date(p_farm_id, now());

  return public.create_sop_run_with_due_event(
    p_farm_id,
    p_cycle_id,
    p_scope_id,
    p_sop_definition_id,
    v_trigger,
    null,
    v_anchor,
    now(),
    now(),
    now() + interval '8 hours',
    'normal',
    'Manual checklist',
    jsonb_build_object('trigger_type', 'manual', 'farm_id', p_farm_id),
    null
  );
end;
$$;

grant execute on function public.create_manual_sop_run(uuid, uuid, uuid, uuid) to authenticated;
