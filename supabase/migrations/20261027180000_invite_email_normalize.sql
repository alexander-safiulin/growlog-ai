-- Invite addresses are stored in one form: lowercase, no whitespace, unwrapped
-- mailto / "Name <email>", trailing punctuation removed when the address is complete.
-- create_farm_invitation rejects anything that is not a normal email.

create or replace function public.normalize_invite_email(p_email text)
returns text
language plpgsql
immutable
as $fn$
declare
  v text;
  wrapped text;
begin
  if p_email is null then
    return null;
  end if;

  v := regexp_replace(
    p_email,
    '[[:space:]' || chr(160) || chr(8203) || chr(8204) || chr(8205) || chr(65279) || ']+',
    '',
    'g'
  );
  v := regexp_replace(v, '[,;:]+$', '');
  v := regexp_replace(v, '^mailto:', '', 'i');

  wrapped := substring(v from '<([^<>]+)>$');
  if wrapped is not null and length(wrapped) > 0 then
    v := wrapped;
  else
    v := regexp_replace(v, '>+$', '');
  end if;

  v := btrim(v, '"''');
  v := lower(v);

  if regexp_replace(v, '\.+$', '') ~ '^[^@]+@[^@]+\.[^@]{2,}$' then
    v := regexp_replace(v, '\.+$', '');
  end if;

  return v;
end;
$fn$;

create or replace function public.invite_email_is_valid(p_email text)
returns boolean
language sql
immutable
as $fn$
  select p_email is not null
    and char_length(p_email) between 1 and 254
    and position('..' in p_email) = 0
    and char_length(split_part(p_email, '@', 1)) between 1 and 64
    and split_part(p_email, '@', 1) !~ '^\.|\.$'
    and char_length(split_part(p_email, '@', 2)) > 0
    and strpos(split_part(p_email, '@', 2), '@') = 0
    and char_length(reverse(split_part(reverse(p_email), '.', 1))) >= 2
    and p_email ~ $re$^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$$re$;
$fn$;

create or replace function public.create_farm_invitation(
  p_farm_id uuid,
  p_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email text;
  v_id uuid;
  v_pending integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_role not in ('grower', 'manager', 'admin', 'viewer') then
    raise exception 'Invalid role';
  end if;
  if not public.is_farm_admin(p_farm_id) then
    raise exception 'Not authorized';
  end if;

  v_email := public.normalize_invite_email(p_email);
  if not public.invite_email_is_valid(v_email) then
    raise exception 'invalid_email';
  end if;

  if exists (
    select 1
    from public.farm_users fu
    join auth.users u on u.id = fu.user_id
    where fu.farm_id = p_farm_id
      and u.email_confirmed_at is not null
      and public.normalize_invite_email(u.email) = v_email
  ) then
    raise exception 'already_member';
  end if;

  select count(*)::integer
  from public.farm_invitations fi
  where fi.farm_id = p_farm_id and fi.status = 'pending'
  into v_pending;
  if v_pending >= 50 then
    raise exception 'too_many_pending';
  end if;

  update public.farm_invitations fi
  set
    role = p_role,
    expires_at = now() + interval '30 days',
    invited_by = auth.uid(),
    updated_at = now()
  where fi.farm_id = p_farm_id
    and fi.email_normalized = v_email
    and fi.status = 'pending'
  returning fi.id into v_id;

  if v_id is null then
    insert into public.farm_invitations (farm_id, email_normalized, role, invited_by, status, expires_at)
    values (p_farm_id, v_email, p_role, auth.uid(), 'pending', now() + interval '30 days')
    returning id into v_id;
  end if;

  return v_id;
end;
$fn$;

revoke all on function public.normalize_invite_email(text) from public, anon;
grant execute on function public.normalize_invite_email(text) to authenticated, service_role;

revoke all on function public.invite_email_is_valid(text) from public, anon;
grant execute on function public.invite_email_is_valid(text) to authenticated, service_role;

revoke all on function public.create_farm_invitation(uuid, text, text) from public, anon;
grant execute on function public.create_farm_invitation(uuid, text, text) to authenticated, service_role;
