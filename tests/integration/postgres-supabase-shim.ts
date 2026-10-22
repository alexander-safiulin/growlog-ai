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
      if (fn !== 'create_log_entry') {
        return { data: null, error: { message: `unsupported rpc ${fn}` } };
      }
      await setPostgresTestAuth(client, userId);
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
      await endPostgresTestAuth(client);
      const data = res.rows[0]?.create_log_entry ?? null;
      return { data, error: null };
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
