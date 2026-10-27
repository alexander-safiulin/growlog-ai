-- Close anon EXECUTE on farm membership / invitation helpers.
--
-- Supabase default privileges grant EXECUTE on new public functions directly to anon,
-- so `revoke ... from public` alone does not remove anon access. These functions are
-- only meaningful for signed-in users (authenticated) and backend jobs (service_role).
--
-- Notes:
-- * user_farm_ids() is used inside RLS policies, which run as the querying role.
--   authenticated and service_role keep EXECUTE; anon queries on farm-scoped tables
--   (which already returned no rows) now fail with "permission denied for function".
--   Public catalog policies for anon do not reference these helpers.
-- * farm_users_enforce_mutations() is a trigger function; trigger execution does not
--   require EXECUTE for the session role.
-- * Idempotent: REVOKE/GRANT can be re-run safely.

revoke all on function public.user_farm_ids() from public, anon;
revoke all on function public.is_farm_admin(uuid) from public, anon;
revoke all on function public.is_farm_manager_or_admin(uuid) from public, anon;
revoke all on function public.normalize_invite_email(text) from public, anon;
revoke all on function public.farm_users_enforce_mutations() from public, anon;
revoke all on function public.create_farm_invitation(uuid, text, text) from public, anon;
revoke all on function public.revoke_farm_invitation(uuid) from public, anon;
revoke all on function public.list_farm_invitations(uuid) from public, anon;
revoke all on function public.accept_pending_invitations_for_current_user() from public, anon;
revoke all on function public.list_farm_members(uuid) from public, anon;
revoke all on function public.change_farm_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.remove_farm_member(uuid, uuid) from public, anon;

grant execute on function public.user_farm_ids() to authenticated, service_role;
grant execute on function public.is_farm_admin(uuid) to authenticated, service_role;
grant execute on function public.is_farm_manager_or_admin(uuid) to authenticated, service_role;
grant execute on function public.normalize_invite_email(text) to authenticated, service_role;
grant execute on function public.farm_users_enforce_mutations() to authenticated, service_role;
grant execute on function public.create_farm_invitation(uuid, text, text) to authenticated, service_role;
grant execute on function public.revoke_farm_invitation(uuid) to authenticated, service_role;
grant execute on function public.list_farm_invitations(uuid) to authenticated, service_role;
grant execute on function public.accept_pending_invitations_for_current_user() to authenticated, service_role;
grant execute on function public.list_farm_members(uuid) to authenticated, service_role;
grant execute on function public.change_farm_member_role(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.remove_farm_member(uuid, uuid) to authenticated, service_role;
