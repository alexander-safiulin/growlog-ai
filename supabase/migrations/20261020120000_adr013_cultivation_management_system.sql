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
  add column if not exists status text not null default 'approved'
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
  add column if not exists status text not null default 'approved'
    check (status in ('draft', 'approved', 'retired'));

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

create index if not exists searchable_documents_embedding_vector_ivfflat
  on public.searchable_documents using ivfflat (embedding_vector vector_cosine_ops)
  with (lists = 100);

-- knowledge_items write policy for managers (insert/update drafts) — flat farm membership for MVP
drop policy if exists knowledge_items_write on public.knowledge_items;
create policy knowledge_items_write on public.knowledge_items for insert
  with check (farm_id in (select public.user_farm_ids()));

create policy knowledge_items_update on public.knowledge_items for update
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));
