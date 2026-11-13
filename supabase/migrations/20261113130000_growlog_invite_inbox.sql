-- Invitee inbox: list pending invites and accept one explicitly (ADR-009).

create or replace function public.list_pending_farm_invitations_for_current_user()
returns table (
  id uuid,
  farm_id uuid,
  farm_name text,
  role text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmed timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select u.email, u.email_confirmed_at
  from auth.users u
  where u.id = auth.uid()
  into v_email, v_confirmed;

  if v_confirmed is null or v_email is null then
    return;
  end if;

  v_email := public.normalize_invite_email(v_email);

  update public.farm_invitations fi
  set status = 'expired', updated_at = now()
  where fi.status = 'pending'
    and fi.expires_at < now()
    and fi.email_normalized = v_email;

  return query
  select
    fi.id,
    fi.farm_id,
    coalesce(f.name, ''),
    fi.role,
    fi.expires_at,
    fi.created_at
  from public.farm_invitations fi
  join public.farms f on f.id = fi.farm_id
  where fi.status = 'pending'
    and fi.email_normalized = v_email
    and fi.expires_at >= now()
  order by fi.created_at asc;
end;
$$;

create or replace function public.accept_farm_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmed timestamptz;
  rec record;
  v_farm_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select u.email, u.email_confirmed_at
  from auth.users u
  where u.id = auth.uid()
  into v_email, v_confirmed;

  if v_confirmed is null or v_email is null then
    raise exception 'Email not confirmed';
  end if;

  v_email := public.normalize_invite_email(v_email);

  select fi.id, fi.farm_id, fi.role
  from public.farm_invitations fi
  where fi.id = p_invitation_id
    and fi.status = 'pending'
    and fi.email_normalized = v_email
    and fi.expires_at >= now()
  into rec;

  if rec.id is null then
    raise exception 'Invitation not found';
  end if;

  insert into public.farm_users (farm_id, user_id, role)
  values (rec.farm_id, auth.uid(), rec.role)
  on conflict (farm_id, user_id) do nothing;

  update public.farm_invitations
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    updated_at = now()
  where id = rec.id and status = 'pending';

  select f.name into v_farm_name from public.farms f where f.id = rec.farm_id;

  return jsonb_build_object(
    'farm_id', rec.farm_id,
    'farm_name', coalesce(v_farm_name, ''),
    'role', rec.role
  );
end;
$$;

revoke all on function public.list_pending_farm_invitations_for_current_user() from public, anon;
grant execute on function public.list_pending_farm_invitations_for_current_user() to authenticated, service_role;

revoke all on function public.accept_farm_invitation(uuid) from public, anon;
grant execute on function public.accept_farm_invitation(uuid) to authenticated, service_role;
