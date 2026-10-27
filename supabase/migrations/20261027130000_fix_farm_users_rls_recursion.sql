-- farm_users UPDATE/DELETE policies referenced farm_users inside their own RLS checks,
-- causing infinite recursion for authenticated direct mutations. Use SECURITY DEFINER helpers.
--
-- Self-service UPDATE (own row) is allowed at RLS for non-role fields; role / farm_id / user_id
-- changes are blocked by farm_users_enforce_mutations (same as pre-recursion policy semantics).

drop policy if exists farm_users_update on public.farm_users;
drop policy if exists farm_users_delete on public.farm_users;

create policy farm_users_update on public.farm_users
  for update
  to authenticated
  using (
    farm_id in (select public.user_farm_ids())
    and (
      user_id = auth.uid()
      or public.is_farm_admin(farm_id)
    )
  )
  with check (
    farm_id in (select public.user_farm_ids())
    and (
      user_id = auth.uid()
      or public.is_farm_admin(farm_id)
    )
  );

create policy farm_users_delete on public.farm_users
  for delete
  to authenticated
  using (
    farm_id in (select public.user_farm_ids())
    and (
      user_id = auth.uid()
      or public.is_farm_admin(farm_id)
    )
  );
