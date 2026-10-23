-- Helpers required by ADR-014 migrations when later ADR-002 hardening migrations are not applied (PGlite tests).
create or replace function public.user_farm_role(p_farm_id uuid)
returns text
language sql
stable
as $$
  select fu.role
  from public.farm_users fu
  where fu.farm_id = p_farm_id and fu.user_id = auth.uid()
  limit 1;
$$;
