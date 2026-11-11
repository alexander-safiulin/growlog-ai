import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { materializeSopRunsForDay } from '@/lib/growlog/sop-engine';
import { createPostgresMigratedTestDb, type PostgresTestDb } from './postgres-test-db';
import { sopMaterializePostgresShim } from './sop-materialize-pg-shim';

describe('sop materialize on Postgres', () => {
  let db: PostgresTestDb;
  const userId = '44444444-4444-4444-8444-444444444444';
  const farmId = '11111111-1111-4111-8111-111111111111';
  const cycleId = '22222222-2222-4222-8222-222222222222';
  const scopeId = '33333333-3333-4333-8333-333333333333';
  const defId = '66666666-6666-4666-8666-666666666666';
  const asnId = '77777777-7777-4777-8777-777777777777';
  const trigEnterId = '88888888-8888-4888-8888-888888888888';
  const trigExitId = '99999999-9999-4999-8999-999999999999';
  const anchorDate = '2026-06-15';

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = process.env.MIGRATION_TEST_USE_DOCKER ?? '1';
    db = await createPostgresMigratedTestDb();
    const { client } = db;
    await client.query(`insert into auth.users (id) values ($1)`, [userId]);
    await client.query(`insert into public.farms (id, name, timezone) values ($1, 'SOP mat', 'UTC')`, [farmId]);
    await client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [farmId, userId]
    );
    await client.query(
      `insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, start_material, created_by)
       values ($1, $2, 'Mat', '2026-01-01', 'active', 'flower', 'seed', $3)`,
      [cycleId, farmId, userId]
    );
    await client.query(
      `insert into public.scopes (id, farm_id, cycle_id, display_name, scope_type, active)
       values ($1, $2, $3, 'Tent', 'tent', true)`,
      [scopeId, farmId, cycleId]
    );
    await client.query(
      `insert into public.sop_definitions (id, farm_id, title, description, applies_to_scope, active, criticality, severity_if_missed)
       values ($1, $2, 'Flower transition pack', null, 'tent', true, 'normal', 'normal')`,
      [defId, farmId]
    );
    await client.query(
      `insert into public.sop_triggers (id, farm_id, sop_definition_id, trigger_type, trigger_config, active)
       values ($1, $2, $3, 'stage_based', $4::jsonb, true)`,
      [
        trigEnterId,
        farmId,
        defId,
        JSON.stringify({ stages: ['flower'], when: 'enter', local_time: '09:00:00' }),
      ]
    );
    await client.query(
      `insert into public.sop_triggers (id, farm_id, sop_definition_id, trigger_type, trigger_config, active)
       values ($1, $2, $3, 'stage_based', $4::jsonb, true)`,
      [
        trigExitId,
        farmId,
        defId,
        JSON.stringify({ stages: ['veg'], when: 'exit', local_time: '10:00:00' }),
      ]
    );
    await client.query(
      `insert into public.sop_assignments (id, farm_id, sop_definition_id, cycle_id, scope_id, assignment_status)
       values ($1, $2, $3, $4, $5, 'active')`,
      [asnId, farmId, defId, cycleId, scopeId]
    );
    await client.query(
      `insert into public.events (farm_id, cycle_id, scope_id, event_type, body, occurred_at, source_type, payload, created_by)
       values ($1, $2, $3, 'stage_changed', 'veg → flower', $4::timestamptz, 'user_form', $5::jsonb, $6)`,
      [
        farmId,
        cycleId,
        scopeId,
        `${anchorDate}T12:00:00.000Z`,
        JSON.stringify({ from_stage: 'veg', to_stage: 'flower' }),
        userId,
      ]
    );
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('materializes one run per matching trigger on the same anchor day', async () => {
    const supabase = sopMaterializePostgresShim(db.client, userId);
    const nowOnAnchor = new Date(`${anchorDate}T08:00:00.000Z`);
    const first = await materializeSopRunsForDay(supabase, {
      farmId,
      cycleId,
      anchorDate,
      timezone: 'UTC',
      now: nowOnAnchor,
    });
    expect(first.created).toBe(2);

    const runs = await db.client.query<{ trigger_id: string }>(
      `select trigger_id from public.sop_runs where assignment_id = $1 and anchor_date = $2::date order by trigger_id`,
      [asnId, anchorDate]
    );
    expect(runs.rows.map((r) => r.trigger_id).sort()).toEqual([trigEnterId, trigExitId].sort());

    const second = await materializeSopRunsForDay(supabase, {
      farmId,
      cycleId,
      anchorDate,
      timezone: 'UTC',
      now: nowOnAnchor,
    });
    expect(second.created).toBe(0);
  });
});
