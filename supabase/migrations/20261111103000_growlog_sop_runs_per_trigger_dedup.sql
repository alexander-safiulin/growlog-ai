-- One materialized run per (assignment, anchor_date, trigger), not per definition per day.
-- Enables multiple triggers on the same SOP (e.g. stage enter + exit, weekday + month day).

drop index if exists public.sop_runs_daily_unique;

create unique index if not exists sop_runs_assignment_anchor_trigger_unique
  on public.sop_runs (assignment_id, anchor_date, trigger_id)
  where anchor_date is not null
    and assignment_id is not null
    and trigger_id is not null;

comment on index public.sop_runs_assignment_anchor_trigger_unique is
  'Calendar materialization: at most one run per assignment, farm-local anchor day, and sop_triggers row.';
