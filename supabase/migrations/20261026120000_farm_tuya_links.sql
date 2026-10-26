-- Bind Tuya Smart Life accounts (and optional device ids) to farms. Writes are operator/service-role only.

create table if not exists public.farm_tuya_links (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  tuya_uid text not null,
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint farm_tuya_links_uid_nonempty check (char_length(trim(tuya_uid)) > 0),
  constraint farm_tuya_links_tuya_uid_key unique (tuya_uid)
);

create index if not exists farm_tuya_links_farm_idx on public.farm_tuya_links (farm_id);

create table if not exists public.farm_tuya_devices (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  tuya_uid text not null,
  tuya_device_id text not null,
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint farm_tuya_devices_id_nonempty check (char_length(trim(tuya_device_id)) > 0),
  constraint farm_tuya_devices_uid_nonempty check (char_length(trim(tuya_uid)) > 0),
  constraint farm_tuya_devices_tuya_device_id_key unique (tuya_device_id)
);

create index if not exists farm_tuya_devices_farm_idx on public.farm_tuya_devices (farm_id);

create or replace function public.validate_farm_tuya_device_uid()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.farm_tuya_links l
    where l.farm_id = new.farm_id and l.tuya_uid = new.tuya_uid
  ) then
    raise exception 'farm_tuya_device_uid_not_linked';
  end if;
  return new;
end;
$$;

drop trigger if exists farm_tuya_devices_validate_uid on public.farm_tuya_devices;
create trigger farm_tuya_devices_validate_uid
  before insert or update on public.farm_tuya_devices
  for each row execute function public.validate_farm_tuya_device_uid();

alter table public.farm_tuya_links enable row level security;
alter table public.farm_tuya_devices enable row level security;

drop policy if exists farm_tuya_links_select on public.farm_tuya_links;
create policy farm_tuya_links_select on public.farm_tuya_links
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()));

drop policy if exists farm_tuya_links_insert on public.farm_tuya_links;
drop policy if exists farm_tuya_links_update on public.farm_tuya_links;
drop policy if exists farm_tuya_links_delete on public.farm_tuya_links;

drop policy if exists farm_tuya_devices_select on public.farm_tuya_devices;
create policy farm_tuya_devices_select on public.farm_tuya_devices
  for select to authenticated
  using (farm_id in (select public.user_farm_ids()));

drop policy if exists farm_tuya_devices_insert on public.farm_tuya_devices;
drop policy if exists farm_tuya_devices_update on public.farm_tuya_devices;
drop policy if exists farm_tuya_devices_delete on public.farm_tuya_devices;

revoke all on public.farm_tuya_links from public, anon, authenticated;
revoke all on public.farm_tuya_devices from public, anon, authenticated;
grant select on public.farm_tuya_links to authenticated;
grant select on public.farm_tuya_devices to authenticated;
grant all on public.farm_tuya_links to service_role;
grant all on public.farm_tuya_devices to service_role;

insert into public.farm_tuya_links (farm_id, tuya_uid)
select '78f5ec84-f32f-4cf1-8b3d-29e2f0200b7a'::uuid, 'az1759503095247CoGAp'
where exists (
  select 1 from public.farms where id = '78f5ec84-f32f-4cf1-8b3d-29e2f0200b7a'::uuid
)
on conflict (tuya_uid) do nothing;
