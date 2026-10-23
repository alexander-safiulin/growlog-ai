import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestPg } from './pglite-test-db';
import { endTestAuth, setTestAuth } from './pglite-test-db';

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Minimal Supabase client for domain RPC + nutrient_recipes updates in PGlite tests.
 */
export function pgliteSupabaseShim(db: TestPg, userId: string): SupabaseClient {
  const client = {
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn !== 'create_log_entry') {
        return { data: null, error: { message: `unsupported rpc ${fn}` } };
      }
      await setTestAuth(db, userId);
      const payload = esc(JSON.stringify(params.p_payload ?? {}));
      const res = await db.query<{ create_log_entry: string }>(
        `select public.create_log_entry(
          '${params.p_farm_id}'::uuid,
          '${params.p_cycle_id}'::uuid,
          '${params.p_scope_id}'::uuid,
          '${esc(String(params.p_event_type))}',
          '${esc(String(params.p_body))}',
          '${params.p_occurred_at}'::timestamptz,
          '${esc(String(params.p_source_type))}',
          '${payload}'::jsonb,
          null
        )::text as create_log_entry`,
      );
      await endTestAuth(db);
      const raw = res.rows[0]?.create_log_entry;
      const data = raw ? JSON.parse(raw) : null;
      return { data, error: null };
    },
    from: (table: string) => {
      if (table !== 'nutrient_recipes') {
        throw new Error(`pglite shim: unsupported table ${table}`);
      }
      return {
        update: (patch: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => ({
            eq: async (col2: string, val2: unknown) => {
              const sets = Object.entries(patch)
                .map(([k, v]) => {
                  if (v === null) return `${k} = null`;
                  return `${k} = '${v}'`;
                })
                .join(', ');
              await db.exec(
                `update public.nutrient_recipes set ${sets} where ${col} = '${val}' and ${col2} = '${val2}'`,
              );
              return { error: null };
            },
          }),
        }),
      };
    },
  };
  return client as unknown as SupabaseClient;
}
