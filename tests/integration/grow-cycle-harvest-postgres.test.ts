import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { transitionGrowCycleStage, upsertGrowCycleHarvest } from '@growlog/domain';
import { createPostgresMigratedTestDb, type PostgresTestDb } from './postgres-test-db';
import { postgresSupabaseShim } from './postgres-supabase-shim';

describe('grow cycle harvest + stage transition RPC on Postgres', () => {
  let db: PostgresTestDb;
  const userId = '44444444-4444-4444-8444-444444444444';
  const farmId = '11111111-1111-4111-8111-111111111111';
  const cycleId = '22222222-2222-4222-8222-222222222222';
  const scopeId = '33333333-3333-4333-8333-333333333333';

  beforeAll(async () => {
    process.env.MIGRATION_TEST_USE_DOCKER = process.env.MIGRATION_TEST_USE_DOCKER ?? '1';
    db = await createPostgresMigratedTestDb();
    const { client } = db;
    await client.query(`insert into auth.users (id) values ($1)`, [userId]);
    await client.query(`insert into public.farms (id, name, timezone) values ($1, 'Harvest RPC', 'UTC')`, [
      farmId,
    ]);
    await client.query(
      `insert into public.farm_users (farm_id, user_id, role) values ($1, $2, 'admin')`,
      [farmId, userId],
    );
    await client.query(
      `insert into public.grow_cycles (id, farm_id, name, start_date, status, stage, start_material, created_by)
       values ($1, $2, 'Test', current_date, 'active', 'drying', 'clone', $3)`,
      [cycleId, farmId, userId],
    );
    await client.query(
      `insert into public.scopes (id, farm_id, cycle_id, display_name, scope_type)
       values ($1, $2, $3, 'Bench', 'tent')`,
      [scopeId, farmId, cycleId],
    );
  }, 300_000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('rejects clone propagation transition', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    await expect(
      transitionGrowCycleStage(supabase, {
        farmId,
        cycleId,
        scopeId,
        newStage: 'propagation',
      }),
    ).rejects.toThrow(/propagation/i);
  });

  it('transitions drying to curing and records harvest', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    const stage = await transitionGrowCycleStage(supabase, {
      farmId,
      cycleId,
      scopeId,
      newStage: 'curing',
    });
    expect((stage.cycle as { stage: string }).stage).toBe('curing');

    const harvest = await upsertGrowCycleHarvest(supabase, {
      farmId,
      cycleId,
      scopeId,
      wetWeightKg: 2.4,
      dryWeightKg: 0.55,
    });
    expect((harvest.harvest as { dry_weight_kg: number }).dry_weight_kg).toBe(0.55);

    const complete = await transitionGrowCycleStage(supabase, {
      farmId,
      cycleId,
      scopeId,
      newStage: 'completed',
    });
    expect((complete.cycle as { stage: string; status: string }).stage).toBe('completed');
    expect((complete.cycle as { status: string }).status).toBe('harvested');
  });
});
