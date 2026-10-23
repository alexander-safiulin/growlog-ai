-- Persist VPD climate source picks per grow cycle (zone fallback when cycle_id is null).

create table public.grow_cycle_vpd_sources (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  cycle_id uuid references public.grow_cycles(id) on delete cascade,
  zone_id uuid references public.farm_zones(id) on delete cascade,
  assignment jsonb not null default '{}'::jsonb,
  leaf_mode text not null default 'none' check (leaf_mode in ('none', 'sensor', 'estimated')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_cycle_vpd_sources_scope check (cycle_id is not null or zone_id is not null)
);

create unique index grow_cycle_vpd_sources_cycle_uidx
  on public.grow_cycle_vpd_sources (cycle_id)
  where cycle_id is not null;

create unique index grow_cycle_vpd_sources_zone_uidx
  on public.grow_cycle_vpd_sources (farm_id, zone_id)
  where cycle_id is null and zone_id is not null;

create trigger grow_cycle_vpd_sources_updated_at
  before update on public.grow_cycle_vpd_sources
  for each row execute function public.set_updated_at();

alter table public.grow_cycle_vpd_sources enable row level security;

create policy grow_cycle_vpd_sources_all on public.grow_cycle_vpd_sources for all
  using (farm_id in (select public.user_farm_ids()))
  with check (farm_id in (select public.user_farm_ids()));
