-- Minimal Supabase-compatible stubs for ephemeral migration tests (not production).

-- Prefer pgcrypto on Postgres; PGlite falls back to a stub UUID function.
do $stub$
begin
  create extension if not exists pgcrypto;
exception
  when others then
    create or replace function public.gen_random_uuid()
    returns uuid
    language sql
    volatile
    as $fn$
      select (
        substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
        substr(md5(random()::text), 1, 4) || '-4' ||
        substr(md5(random()::text), 5, 3) || '-' ||
        substr('89ab', 1 + (random() * 3)::int, 1) ||
        substr(md5(random()::text), 1, 3) || '-' ||
        substr(md5(random()::text), 1, 12)
      )::uuid;
    $fn$;
end $stub$;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select null::uuid $$;

create or replace function auth.role()
returns text
language sql
stable
as $$ select 'anon'::text $$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$ select '{}'::jsonb $$;

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid
);

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;
