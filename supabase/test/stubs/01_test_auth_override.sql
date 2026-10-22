-- Test-only auth.uid() / auth.role() driven by session settings (PGlite integration tests).
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.auth_uid', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('test.auth_role', true), ''), 'anon');
$$;
