import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromBearer } from '@/lib/api/auth-from-request';
import { createServiceRoleSupabase } from '@/lib/growlog/background-worker-core';

const TABLES = [
  'sop_revisions',
  'playbook_thresholds',
  'deviations',
  'cycle_stage_plan',
  'shift_handovers',
  'sop_revision_translations',
] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) return res.status(401).json({ error: 'unauthorized' });

  const supabase = createServiceRoleSupabase();
  const missing: string[] = [];
  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      const msg = error.message ?? '';
      if (/does not exist|schema cache|PGRST205/i.test(msg)) {
        missing.push(table);
      }
    }
  }

  const ready = missing.length === 0;
  return res.status(ready ? 200 : 503).json({
    ready,
    missing_tables: missing,
    hint: ready ? null : 'Run pnpm db:push to apply ADR-013 migration',
  });
}
