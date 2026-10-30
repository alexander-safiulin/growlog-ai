import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client } from 'pg';
import { endPostgresTestAuth, setPostgresTestAuth } from './postgres-test-db';

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

/** Supabase shim for domain feeding tests on real Postgres (uses migration create_log_entry). */
export function postgresSupabaseShim(client: Client, userId: string): SupabaseClient {
  const shim = {
    rpc: async (fn: string, params: Record<string, unknown>) => {
      await setPostgresTestAuth(client, userId);
      try {
        if (fn === 'create_log_entry') {
          const payload = esc(JSON.stringify(params.p_payload ?? {}));
          const res = await client.query<{ create_log_entry: unknown }>(
            `select public.create_log_entry(
              $1::uuid, $2::uuid, $3::uuid, $4, $5, $6::timestamptz, $7, $8::jsonb, null) as create_log_entry`,
            [
              params.p_farm_id,
              params.p_cycle_id,
              params.p_scope_id,
              params.p_event_type,
              params.p_body,
              params.p_occurred_at,
              params.p_source_type,
              payload,
            ],
          );
          return { data: res.rows[0]?.create_log_entry ?? null, error: null };
        }

        if (fn === 'transition_grow_cycle_stage') {
          const res = await client.query<{ transition_grow_cycle_stage: unknown }>(
            `select public.transition_grow_cycle_stage($1::uuid, $2::uuid, $3::uuid, $4, $5::timestamptz, $6) as transition_grow_cycle_stage`,
            [
              params.p_farm_id,
              params.p_cycle_id,
              params.p_scope_id,
              params.p_new_stage,
              params.p_occurred_at ?? new Date().toISOString(),
              params.p_allow_backward ?? false,
            ],
          );
          return { data: res.rows[0]?.transition_grow_cycle_stage ?? null, error: null };
        }

        if (fn === 'upsert_grow_cycle_harvest') {
          const res = await client.query<{ upsert_grow_cycle_harvest: unknown }>(
            `select public.upsert_grow_cycle_harvest($1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::numeric, $6::timestamptz, $7, $8::jsonb) as upsert_grow_cycle_harvest`,
            [
              params.p_farm_id,
              params.p_cycle_id,
              params.p_scope_id,
              params.p_wet_weight_kg ?? null,
              params.p_dry_weight_kg ?? null,
              params.p_harvested_at ?? new Date().toISOString(),
              params.p_notes ?? null,
              params.p_weight_patch ? JSON.stringify(params.p_weight_patch) : null,
            ],
          );
          return { data: res.rows[0]?.upsert_grow_cycle_harvest ?? null, error: null };
        }

        if (fn === 'create_farm_invitation') {
          const res = await client.query<{ id: string }>(
            `select public.create_farm_invitation($1::uuid, $2, $3) as id`,
            [params.p_farm_id, params.p_email, params.p_role],
          );
          return { data: res.rows[0]?.id ?? null, error: null };
        }

        if (fn === 'accept_pending_invitations_for_current_user') {
          const res = await client.query(
            `select * from public.accept_pending_invitations_for_current_user()`,
          );
          const data = res.rows.map((row) => {
            const v = Object.values(row)[0];
            return v;
          });
          return { data, error: null };
        }

        if (fn === 'revoke_farm_invitation') {
          await client.query(`select public.revoke_farm_invitation($1::uuid)`, [
            params.p_invitation_id,
          ]);
          return { data: null, error: null };
        }

        if (fn === 'create_grow_cycle_feeding_log') {
          const res = await client.query<{ create_grow_cycle_feeding_log: unknown }>(
            `select public.create_grow_cycle_feeding_log(
              $1::uuid, $2::uuid, $3::uuid, $4, $5::numeric, $6::numeric, $7::numeric, $8::numeric, $9::numeric,
              $10::uuid, $11, $12::timestamptz, $13::jsonb, $14, $15::smallint, $16::smallint, $17::time, $18, $19
            ) as create_grow_cycle_feeding_log`,
            [
              params.p_farm_id,
              params.p_cycle_id,
              params.p_scope_id,
              params.p_entry_kind,
              params.p_volume_ml,
              params.p_ph ?? null,
              params.p_ec_ms ?? null,
              params.p_air_temp_c ?? null,
              params.p_air_rh_pct ?? null,
              params.p_recipe_id ?? null,
              params.p_comment ?? null,
              params.p_occurred_at ?? new Date().toISOString(),
              JSON.stringify(params.p_doses ?? []),
              params.p_new_stage ?? null,
              params.p_light_hours_on ?? null,
              params.p_light_hours_off ?? null,
              params.p_lights_on_at ?? null,
              params.p_allow_backward ?? false,
              params.p_recipe_composition_trusted ?? true,
            ],
          );
          return { data: res.rows[0]?.create_grow_cycle_feeding_log ?? null, error: null };
        }

        return { data: null, error: { message: `unsupported rpc ${fn}` } };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { data: null, error: { message } };
      } finally {
        await endPostgresTestAuth(client);
      }
    },
    from: (table: string) => {
      if (table !== 'nutrient_recipes') {
        throw new Error(`postgres shim: unsupported table ${table}`);
      }
      return {
        update: (patch: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => ({
            eq: async (col2: string, val2: unknown) => {
              const keys = Object.keys(patch);
              const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
              const values = keys.map((k) => patch[k]);
              values.push(val, val2);
              await client.query(
                `update public.nutrient_recipes set ${sets} where ${col} = $${keys.length + 1} and ${col2} = $${keys.length + 2}`,
                values,
              );
              return { error: null };
            },
          }),
        }),
      };
    },
  };
  return shim as unknown as SupabaseClient;
}
