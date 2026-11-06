-- Room that the assigned air/humidity sensors belong to.

alter table public.grow_cycle_vpd_sources
  add column if not exists scope_id uuid references public.scopes(id) on delete set null;

drop trigger if exists grow_cycle_vpd_sources_validate_farm_refs on public.grow_cycle_vpd_sources;
create trigger grow_cycle_vpd_sources_validate_farm_refs
  before insert or update on public.grow_cycle_vpd_sources
  for each row execute function public.validate_referenced_farms(
    'cycle_id', 'grow_cycles',
    'zone_id', 'farm_zones',
    'scope_id', 'scopes'
  );
