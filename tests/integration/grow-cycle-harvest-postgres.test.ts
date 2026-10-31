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
    process.env.MIGRATION_TEST_USE_DOCKER = '1';
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
       values ($1, $2, 'Test', '2026-10-01', 'active', 'drying', 'clone', $3)`,
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
        allowBackward: true,
      }),
    ).rejects.toThrow(/проращиван|propagation/i);
  });

  it('allows backward stage without allow_backward flag', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    const result = await transitionGrowCycleStage(supabase, {
      farmId,
      cycleId,
      scopeId,
      newStage: 'veg',
    });
    expect((result.cycle as { stage: string }).stage).toBe('veg');
  });

  it('rejects negative harvest weights', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    await expect(
      upsertGrowCycleHarvest(supabase, {
        farmId,
        cycleId,
        scopeId,
        wetWeightKg: -1,
      }),
    ).rejects.toThrow(/wet_weight/i);
  });

  it('transitions drying to curing, harvest patch, complete with end_date', async () => {
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
      harvestedAt: '2026-10-20T12:00:00.000Z',
    });
    expect((harvest.harvest as { dry_weight_kg: number }).dry_weight_kg).toBe(0.55);

    const cleared = await upsertGrowCycleHarvest(supabase, {
      farmId,
      cycleId,
      scopeId,
      weightPatch: { wet_weight_kg: null, dry_weight_kg: 0.5 },
    });
    expect((cleared.harvest as { wet_weight_kg: null }).wet_weight_kg).toBeNull();

    const complete = await transitionGrowCycleStage(supabase, {
      farmId,
      cycleId,
      scopeId,
      newStage: 'completed',
      occurredAt: '2026-10-22T15:00:00.000Z',
    });
    expect((complete.cycle as { stage: string; status: string; end_date: string }).stage).toBe('completed');
    expect((complete.cycle as { status: string }).status).toBe('harvested');
    expect((complete.cycle as { end_date: string }).end_date).toBe('2026-10-22');

    const ev = await db.client.query<{ body: string; payload: { dry_weight_kg: number | null } }>(
      `select body, payload from public.events where cycle_id = $1 and event_type = 'harvest' order by occurred_at desc limit 1`,
      [cycleId],
    );
    expect(Number(ev.rows[0]?.payload?.dry_weight_kg)).toBe(0.5);
    expect(ev.rows[0]?.body).toContain('—');
    expect(ev.rows[0]?.body).toMatch(/0,5/);
    expect(ev.rows[0]?.body).not.toMatch(/1\./);
  });

  it('backward from completed reactivates cycle and clears end_date', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    const back = await transitionGrowCycleStage(supabase, {
      farmId,
      cycleId,
      scopeId,
      newStage: 'curing',
      allowBackward: true,
    });
    const cycle = back.cycle as { stage: string; status: string; end_date: string | null };
    expect(cycle.stage).toBe('curing');
    expect(cycle.status).toBe('active');
    expect(cycle.end_date).toBeNull();
  });

  it('formats whole-number harvest weights without trailing dot', async () => {
    const supabase = postgresSupabaseShim(db.client, userId);
    await upsertGrowCycleHarvest(supabase, {
      farmId,
      cycleId,
      scopeId,
      wetWeightKg: 1,
      dryWeightKg: 1,
    });
    const ev = await db.client.query<{ body: string }>(
      `select body from public.events where cycle_id = $1 and event_type = 'harvest' order by occurred_at desc limit 1`,
      [cycleId],
    );
    const body = ev.rows[0]?.body ?? '';
    expect(body).toMatch(/сырая 1 кг/);
    expect(body).toMatch(/сухая 1 кг/);
    expect(body).not.toMatch(/1\./);
  });
});
