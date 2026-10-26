-- Farm invitations by email (ADR-009). Client accepts via RPC after confirmed sign-in.
-- auth.users.email / email_confirmed_at exist on hosted Supabase; test stubs add them locally.

create table if not exists public.farm_invitations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  email_normalized text not null check (
    email_normalized = lower(btrim(email_normalized))
    and position('@' in email_normalized) > 1
  ),
  role text not null check (role in ('grower', 'manager', 'admin', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists farm_invitations_one_pending
  on public.farm_invitations (farm_id, email_normalized)
  where status = 'pending';

create index if not exists farm_invitations_farm_status
  on public.farm_invitations (farm_id, status, created_at desc);

drop trigger if exists farm_invitations_updated_at on public.farm_invitations;
create trigger farm_invitations_updated_at
  before update on public.farm_invitations
  for each row execute function public.set_updated_at();

alter table public.farm_invitations enable row level security;

revoke all on table public.farm_invitations from public;
revoke all on table public.farm_invitations from anon;

drop policy if exists farm_invitations_select on public.farm_invitations;
create policy farm_invitations_select on public.farm_invitations
  for select
  using (
    farm_id in (select public.user_farm_ids())
    and exists (
      select 1
      from public.farm_users fu
      where fu.farm_id = farm_invitations.farm_id
        and fu.user_id = auth.uid()
        and fu.role in ('admin', 'manager')
    )
  );

drop policy if exists farm_invitations_insert on public.farm_invitations;
create policy farm_invitations_insert on public.farm_invitations
  for insert
  with check (false);

drop policy if exists farm_invitations_update on public.farm_invitations;
create policy farm_invitations_update on public.farm_invitations
  for update
  using (false)
  with check (false);

drop policy if exists farm_invitations_delete on public.farm_invitations;
create policy farm_invitations_delete on public.farm_invitations
  for delete
  using (false);

-- ─── Membership helpers ───────────────────────────────────────────────────────

create or replace function public.is_farm_admin(p_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_users fu
    where fu.farm_id = p_farm_id
      and fu.user_id = auth.uid()
      and fu.role = 'admin'
  );
$$;

create or replace function public.is_farm_manager_or_admin(p_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_users fu
    where fu.farm_id = p_farm_id
      and fu.user_id = auth.uid()
      and fu.role in ('admin', 'manager')
  );
$$;

revoke all on function public.is_farm_admin(uuid) from public;
grant execute on function public.is_farm_admin(uuid) to authenticated;

revoke all on function public.is_farm_manager_or_admin(uuid) from public;
grant execute on function public.is_farm_manager_or_admin(uuid) to authenticated;

-- ─── Last-admin protection ────────────────────────────────────────────────────

create or replace function public.farm_users_enforce_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
  admin_count integer;
  farm_active boolean;
begin
  if TG_OP = 'UPDATE' then
    if NEW.user_id <> OLD.user_id or NEW.farm_id <> OLD.farm_id then
      raise exception 'Cannot change user_id or farm_id';
    end if;

    select exists (
      select 1 from public.farms f
      where f.id = OLD.farm_id and not f.is_deleted
    ) into farm_active;

    if farm_active and auth.uid() is not null and OLD.role = 'admin' and NEW.role is distinct from OLD.role and NEW.role <> 'admin' then
      perform 1
      from public.farm_users fu
      where fu.farm_id = OLD.farm_id and fu.role = 'admin'
      for update;
      select count(*)::integer
      from public.farm_users fu
      where fu.farm_id = OLD.farm_id and fu.role = 'admin'
      into admin_count;
      if admin_count <= 1 then
        raise exception 'last_admin';
      end if;
    end if;

    if NEW.role is distinct from OLD.role then
      select exists(
        select 1 from public.farm_users fu
        where fu.farm_id = OLD.farm_id and fu.user_id = auth.uid() and fu.role = 'admin'
      ) into actor_is_admin;
      if not coalesce(actor_is_admin, false) then
        raise exception 'Only farm admins can change roles';
      end if;
    end if;

    if OLD.user_id <> auth.uid() then
      select exists(
        select 1 from public.farm_users fu
        where fu.farm_id = OLD.farm_id and fu.user_id = auth.uid() and fu.role = 'admin'
      ) into actor_is_admin;
      if not coalesce(actor_is_admin, false) then
        raise exception 'Only farm admins can edit other members';
      end if;
    end if;

    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    if auth.uid() is null then
      return OLD;
    end if;

    select exists (
      select 1 from public.farms f
      where f.id = OLD.farm_id and not f.is_deleted
    ) into farm_active;

    if farm_active and OLD.role = 'admin' then
      perform 1
      from public.farm_users fu
      where fu.farm_id = OLD.farm_id and fu.role = 'admin'
      for update;
      select count(*)::integer
      from public.farm_users fu
      where fu.farm_id = OLD.farm_id and fu.role = 'admin'
      into admin_count;
      if admin_count <= 1 then
        raise exception 'last_admin';
      end if;
    end if;

    if OLD.user_id = auth.uid() then
      return OLD;
    end if;
    select exists(
      select 1 from public.farm_users fu
      where fu.farm_id = OLD.farm_id and fu.user_id = auth.uid() and fu.role = 'admin'
    ) into actor_is_admin;
    if not coalesce(actor_is_admin, false) then
      raise exception 'Only farm admins can remove other members';
    end if;
    return OLD;
  end if;

  return null;
end;
$$;

-- ─── Invitation + membership RPCs ─────────────────────────────────────────────

create or replace function public.normalize_invite_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(btrim(p_email));
$$;

create or replace function public.create_farm_invitation(
  p_farm_id uuid,
  p_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
  if v_email is null or position('@' in v_email) <= 1 then
    raise exception 'Invalid email';
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

  -- TODO: send invitation email when transactional mailer exists

  return v_id;
end;
$$;

create or replace function public.revoke_farm_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farm_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select fi.farm_id
  from public.farm_invitations fi
  where fi.id = p_invitation_id and fi.status = 'pending'
  into v_farm_id;

  if v_farm_id is null then
    raise exception 'Invitation not found';
  end if;
  if not public.is_farm_admin(v_farm_id) then
    raise exception 'Not authorized';
  end if;

  update public.farm_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_invitation_id and status = 'pending';
end;
$$;

create or replace function public.list_farm_invitations(p_farm_id uuid)
returns table (
  id uuid,
  email_normalized text,
  role text,
  status text,
  invited_by uuid,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_farm_manager_or_admin(p_farm_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    fi.id,
    fi.email_normalized,
    fi.role,
    fi.status,
    fi.invited_by,
    fi.expires_at,
    fi.created_at,
    fi.accepted_at,
    fi.revoked_at
  from public.farm_invitations fi
  where fi.farm_id = p_farm_id
    and (
      fi.status = 'pending'
      or fi.created_at > now() - interval '90 days'
    )
  order by fi.created_at desc;
end;
$$;

create or replace function public.accept_pending_invitations_for_current_user()
returns setof jsonb
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
    return;
  end if;

  v_email := public.normalize_invite_email(v_email);

  update public.farm_invitations fi
  set status = 'expired', updated_at = now()
  where fi.status = 'pending'
    and fi.expires_at < now()
    and fi.email_normalized = v_email;

  for rec in
    select fi.id, fi.farm_id, fi.role
    from public.farm_invitations fi
    where fi.status = 'pending'
      and fi.email_normalized = v_email
      and fi.expires_at >= now()
    order by fi.created_at asc
  loop
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

    return next jsonb_build_object(
      'farm_id', rec.farm_id,
      'farm_name', coalesce(v_farm_name, ''),
      'role', rec.role
    );
  end loop;
end;
$$;

create or replace function public.list_farm_members(p_farm_id uuid)
returns table (
  user_id uuid,
  display_name text,
  role text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_email boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.farm_users fu
    where fu.farm_id = p_farm_id and fu.user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  v_show_email := public.is_farm_admin(p_farm_id);

  return query
  select
    fu.user_id,
    fu.display_name,
    fu.role,
    case when v_show_email then u.email else null end as email,
    fu.created_at
  from public.farm_users fu
  left join auth.users u on u.id = fu.user_id
  where fu.farm_id = p_farm_id
  order by fu.created_at asc;
end;
$$;

create or replace function public.change_farm_member_role(
  p_farm_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  perform public.set_farm_user_role(p_farm_id, p_user_id, p_role);
end;
$$;

create or replace function public.remove_farm_member(
  p_farm_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id = auth.uid() then
    delete from public.farm_users
    where farm_id = p_farm_id and user_id = p_user_id;
    if not found then
      raise exception 'Membership not found';
    end if;
    return;
  end if;

  if not public.is_farm_admin(p_farm_id) then
    raise exception 'Not authorized';
  end if;

  delete from public.farm_users
  where farm_id = p_farm_id and user_id = p_user_id;
  if not found then
    raise exception 'Membership not found';
  end if;
end;
$$;

revoke all on function public.create_farm_invitation(uuid, text, text) from public;
grant execute on function public.create_farm_invitation(uuid, text, text) to authenticated;

revoke all on function public.revoke_farm_invitation(uuid) from public;
grant execute on function public.revoke_farm_invitation(uuid) to authenticated;

revoke all on function public.list_farm_invitations(uuid) from public;
grant execute on function public.list_farm_invitations(uuid) to authenticated;

revoke all on function public.accept_pending_invitations_for_current_user() from public;
grant execute on function public.accept_pending_invitations_for_current_user() to authenticated;

revoke all on function public.list_farm_members(uuid) from public;
grant execute on function public.list_farm_members(uuid) to authenticated;

revoke all on function public.change_farm_member_role(uuid, uuid, text) from public;
grant execute on function public.change_farm_member_role(uuid, uuid, text) to authenticated;

revoke all on function public.remove_farm_member(uuid, uuid) from public;
grant execute on function public.remove_farm_member(uuid, uuid) to authenticated;
