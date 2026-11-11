# Job `sop.materialize` (ADR-006, ADR-008)

## Purpose

Create or refresh **calendar** `sop_runs` for one **farm-local anchor day** (`anchor_date`, `yyyy-MM-dd`) on a `grow_cycles` row. Event-based runs are **not** created here.

Canonical execution is **service role** in `growlog-worker`, not the browser.

## Enqueue

| Source | When | Priority | Dedupe key |
|--------|------|----------|------------|
| `enqueue_standard_event_jobs` | `events.event_type = stage_changed` | `high` | `sop.materialize:{cycle_id}:{farm_local_date}` |
| `focus.refresh` worker | Before Daily Focus assembly | (inside job) | N/A — inline call |

Migration: `supabase/migrations/20261111120000_growlog_sop_materialize_job.sql`  
Feeding stage events: `20261111123000_growlog_feeding_stage_sop_enqueue.sql` (same enqueue path as other cycle events).

### Payload (`background_jobs.payload_json`)

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `anchor_date` | string | yes | Farm-local calendar day; must match `^\d{4}-\d{2}-\d{2}$` |
| `event_id` | uuid | no | Source `stage_changed` event when enqueued from fact bus |

Row fields used: `farm_id`, `cycle_id` (required), `scope_id` (informational on job row).

## Handler

- Code: [`lib/growlog/sop-materialize-job.ts`](../../lib/growlog/sop-materialize-job.ts) → `processSopMaterializeJob`
- Worker switch: [`scripts/background-worker.ts`](../../scripts/background-worker.ts) (`case 'sop.materialize'`)
- Engine: `materializeSopRunsForDay` in `@growlog/domain` (trigger eval, `create_sop_run_with_due_event`, overdue pass, `refresh_sop_compliance_daily`)

### Success result shape (stored on job completion)

```json
{
  "materialized": true,
  "anchor_date": "2026-06-15",
  "created": 2,
  "skippedIneligible": 0,
  "evalNoMatch": 1,
  "overdueUpdated": 0,
  "complianceRefreshed": true,
  "skippedTriggers": 1
}
```

### Failure / skip

| `result` | Meaning |
|----------|---------|
| `{ "materialized": false, "reason": "missing_anchor_or_cycle" }` | Bad payload or missing `cycle_id` on job |
| Job `failed` + error text | DB/RPC error from engine |

## Client acceleration (non-canonical)

Web/mobile may call `loadOpenSopRunsForCycleDay` (`@growlog/domain`):

- At most **one** materialize per `(farmId, cycleId, anchor_date)` per tab session (`sop-materialize-once`)
- React Query **`staleTime`**: `SOP_OPEN_RUNS_STALE_MS` (60s) on open-runs lists
- After **import commit** or **new definition**, call `clearSopMaterializeOnce(sopMaterializeScopeKey(farmId, cycleId))` so the next fetch materializes again

`POST /api/sop/materialize` remains for tools/legacy; product UI prefers Supabase session + domain materialize.

## Related

- Dedup index: `sop_runs_assignment_anchor_trigger_unique` (`20261111103000_growlog_sop_runs_per_trigger_dedup.sql`)
- Daily Focus also materializes on `focus_date` inside `processFocusRefreshJob` ([`derived-data-pipeline.ts`](../../lib/growlog/derived-data-pipeline.ts))
- Limitations: [`sop-engine-known-limitations.md`](./sop-engine-known-limitations.md)
