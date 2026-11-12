-- ADR-018: user-authored layer on reports (worker must not overwrite).

do $migration$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'editor_json'
  ) then
    alter table public.reports
      add column editor_json jsonb not null default '{}'::jsonb;
  end if;
end $migration$;

comment on column public.reports.editor_json is
  'ADR-018: user comments, intro/outro, hidden blocks/photos; not touched by report.generate.';
