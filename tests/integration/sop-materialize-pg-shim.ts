import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client } from 'pg';
import { endPostgresTestAuth, setPostgresTestAuth } from './postgres-test-db';

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[] }
  | { kind: 'gte'; col: string; val: unknown }
  | { kind: 'lt'; col: string; val: unknown };

type QueryMode = 'select' | 'update';

function parseSelectColumns(select: string): string {
  if (!select.includes('(')) return select;
  return select;
}

class PgQueryBuilder {
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private patch: Record<string, unknown> | null = null;
  private mode: QueryMode = 'select';
  private insertRow: Record<string, unknown> | null = null;

  constructor(
    private client: Client,
    private table: string,
    private userId: string,
    private columns: string = '*',
  ) {}

  select(cols: string) {
    this.columns = parseSelectColumns(cols);
    return this;
  }

  insert(row: Record<string, unknown>) {
    this.insertRow = row;
    return {
      select: () => ({
        single: async () => this.runInsertSingle(),
      }),
    };
  }

  update(patch: Record<string, unknown>) {
    this.mode = 'update';
    this.patch = patch;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ kind: 'eq', col, val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ kind: 'in', col, vals });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ kind: 'gte', col, val });
    return this;
  }

  lt(col: string, val: unknown) {
    this.filters.push({ kind: 'lt', col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }

  async maybeSingle() {
    this.limitN = 1;
    const { data, error } = await this.runSelect();
    if (error) return { data: null, error };
    const row = Array.isArray(data) ? data[0] ?? null : null;
    return { data: row, error: null };
  }

  async single() {
    this.limitN = 1;
    const { data, error } = await this.runSelect();
    if (error) return { data: null, error };
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return { data: null, error: { message: 'not_found' } };
    return { data: row, error: null };
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const run =
      this.mode === 'update' ? this.runUpdate() : this.insertRow ? this.runInsert() : this.runSelect();
    return run.then(onfulfilled, onrejected);
  }

  private async withAuth<T>(fn: () => Promise<T>): Promise<T> {
    await setPostgresTestAuth(this.client, this.userId);
    try {
      return await fn();
    } finally {
      await endPostgresTestAuth(this.client);
    }
  }

  private buildWhere(startIdx: number): { sql: string; values: unknown[] } {
    const values: unknown[] = [];
    const parts: string[] = [];
    let i = startIdx;
    for (const f of this.filters) {
      if (f.kind === 'eq') {
        parts.push(`${f.col} = $${i++}`);
        values.push(f.val);
      } else if (f.kind === 'in') {
        parts.push(`${f.col} = any($${i++})`);
        values.push(f.vals);
      } else if (f.kind === 'gte') {
        parts.push(`${f.col} >= $${i++}`);
        values.push(f.val);
      } else if (f.kind === 'lt') {
        parts.push(`${f.col} < $${i++}`);
        values.push(f.val);
      }
    }
    return { sql: parts.length ? `where ${parts.join(' and ')}` : '', values };
  }

  private async runSelect(): Promise<{ data: unknown; error: null }> {
    return this.withAuth(async () => {
      const { sql: where, values } = this.buildWhere(1);
      let q = `select ${this.columns} from public.${this.table} ${where}`;
      if (this.orderBy) {
        q += ` order by ${this.orderBy.col} ${this.orderBy.ascending ? 'asc' : 'desc'}`;
      }
      if (this.limitN != null) q += ` limit ${this.limitN}`;
      const res = await this.client.query(q, values);
      return { data: res.rows, error: null };
    });
  }

  private async runUpdate(): Promise<{ data: unknown; error: null }> {
    return this.withAuth(async () => {
      if (!this.patch) return { data: null, error: null };
      const keys = Object.keys(this.patch);
      const sets = keys.map((k, idx) => `${k} = $${idx + 1}`).join(', ');
      const values = keys.map((k) => this.patch![k]);
      const { sql: where, values: wvals } = this.buildWhere(keys.length + 1);
      await this.client.query(
        `update public.${this.table} set ${sets} ${where}`,
        [...values, ...wvals]
      );
      return { data: null, error: null };
    });
  }

  private async runInsert(): Promise<{ data: unknown; error: null }> {
    return this.withAuth(async () => {
      if (!this.insertRow) return { data: null, error: null };
      const keys = Object.keys(this.insertRow);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => this.insertRow![k]);
      const res = await this.client.query(
        `insert into public.${this.table} (${cols}) values (${placeholders}) returning *`,
        values
      );
      return { data: res.rows, error: null };
    });
  }

  private async runInsertSingle(): Promise<{ data: unknown; error: null | { message: string } }> {
    const { data, error } = await this.runInsert();
    if (error) return { data: null, error };
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return { data: null, error: { message: 'insert_failed' } };
    return { data: row, error: null };
  }
}

const SOP_TABLES = new Set([
  'grow_cycles',
  'events',
  'sop_assignments',
  'sop_definitions',
  'sop_runs',
  'sop_triggers',
  'deviations',
]);

/** Postgres shim for `materializeSopRunsForDay` integration tests. */
export function sopMaterializePostgresShim(client: Client, userId: string): SupabaseClient {
  const shim = {
    rpc: async (fn: string, params: Record<string, unknown>) => {
      await setPostgresTestAuth(client, userId);
      try {
        if (fn === 'create_sop_run_with_due_event') {
          const res = await client.query<{ create_sop_run_with_due_event: string }>(
            `select public.create_sop_run_with_due_event(
              $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::date,
              $8::timestamptz, $9::timestamptz, $10::timestamptz, $11, $12, $13::jsonb, $14::uuid
            ) as create_sop_run_with_due_event`,
            [
              params.p_farm_id,
              params.p_cycle_id,
              params.p_scope_id,
              params.p_sop_definition_id,
              params.p_trigger_id,
              params.p_assignment_id,
              params.p_anchor_date,
              params.p_due_at,
              params.p_due_window_start,
              params.p_due_window_end,
              params.p_priority,
              params.p_reason_text,
              JSON.stringify(params.p_trigger_snapshot ?? {}),
              params.p_source_event_id ?? null,
            ]
          );
          return { data: res.rows[0]?.create_sop_run_with_due_event ?? null, error: null };
        }
        if (fn === 'refresh_sop_compliance_daily') {
          await client.query(`select public.refresh_sop_compliance_daily($1::uuid, $2::uuid, $3::date)`, [
            params.p_farm_id,
            params.p_cycle_id,
            params.p_on,
          ]);
          return { data: null, error: null };
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
      if (!SOP_TABLES.has(table)) {
        throw new Error(`sop materialize shim: unsupported table ${table}`);
      }
      return new PgQueryBuilder(client, table, userId);
    },
  };
  return shim as unknown as SupabaseClient;
}
