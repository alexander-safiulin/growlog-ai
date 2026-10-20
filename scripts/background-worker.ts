/**
 * Long-running background worker: claims jobs via service role and completes/fails them.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   WORKER_ID (optional, default: hostname-pid)
 *   WORKER_POLL_MS (optional, default: 1000)
 *   WORKER_JOB_TYPE (optional filter for claim_background_job)
 *   WORKER_FARM_ID (optional filter)
 *
 * tsx does not load .env. Next.js does. Read the local files here and leave
 * variables already set by the process (Coolify) untouched.
 *
 * Run: pnpm worker
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  claimBackgroundJob,
  completeBackgroundJob,
  createServiceRoleSupabase,
  failBackgroundJob,
} from '../lib/growlog/background-worker-core';
import {
  processDocumentIndexJob,
  processFocusRefreshJob,
  processSnapshotRefreshJob,
  processTimelineDailyRefreshJob,
} from '../lib/growlog/derived-data-pipeline';
import {
  processPhotoAnalyzeJob,
  processPhotoTimelineRefreshJob,
} from '../lib/growlog/photo-pipeline';
import { processReportGenerateJob } from '../lib/growlog/report-pipeline';
import {
  processCycleLessonsDraftJob,
  processKnowledgeImportJob,
} from '../lib/growlog/cms-pipeline';
import type { BackgroundJobRow } from '../types/background-jobs';
import { hostname } from 'node:os';

function loadLocalEnv(fileName: string, fromFile: Set<string>) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined && !fromFile.has(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    fromFile.add(key);
  }
}

const envFromFile = new Set<string>();
loadLocalEnv('.env', envFromFile);
loadLocalEnv('.env.local', envFromFile);

const pollMs = Math.max(200, Number(process.env.WORKER_POLL_MS || 1000));
const workerId =
  process.env.WORKER_ID?.trim() || `${hostname().split('.')[0]}-${process.pid}`;
const jobTypeFilter = process.env.WORKER_JOB_TYPE?.trim() || null;
const farmIdFilter = process.env.WORKER_FARM_ID?.trim() || null;

let shuttingDown = false;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processJob(
  supabase: ReturnType<typeof createServiceRoleSupabase>,
  job: BackgroundJobRow
): Promise<Record<string, unknown>> {
  switch (job.job_type) {
    case 'photo.analyze':
      return processPhotoAnalyzeJob(supabase, job);
    case 'photo.timeline.refresh':
      return processPhotoTimelineRefreshJob(supabase, job);
    case 'report.generate':
      return processReportGenerateJob(supabase, job);
    case 'document.index':
      return processDocumentIndexJob(supabase, job);
    case 'timeline.daily.refresh':
      return processTimelineDailyRefreshJob(supabase, job);
    case 'focus.refresh':
      return processFocusRefreshJob(supabase, job);
    case 'snapshot.refresh':
      return processSnapshotRefreshJob(supabase, job);
    case 'knowledge.import':
      return processKnowledgeImportJob(supabase, job);
    case 'cycle.lessons.draft':
      return processCycleLessonsDraftJob(supabase, job);
    default:
      return { handled: true, stub: true, unknown_job_type: job.job_type };
  }
}

async function runLoop() {
  const supabase = createServiceRoleSupabase();
  // eslint-disable-next-line no-console
  console.error(`[growlog-worker] started id=${workerId} pollMs=${pollMs}`);

  while (!shuttingDown) {
    try {
      const job = await claimBackgroundJob(supabase, {
        workerId,
        jobType: jobTypeFilter,
        farmId: farmIdFilter || null,
      });

      if (!job) {
        await sleep(pollMs);
        continue;
      }

      // eslint-disable-next-line no-console
      console.error(`[growlog-worker] claimed ${job.id} type=${job.job_type} farm=${job.farm_id}`);

      try {
        const result = await processJob(supabase, job);
        await completeBackgroundJob(supabase, job.id, workerId, result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error(`[growlog-worker] job ${job.id} error:`, msg);
        await failBackgroundJob(supabase, job.id, workerId, msg, 120);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error('[growlog-worker] loop error:', msg);
      await sleep(pollMs);
    }
  }
}

process.on('SIGINT', () => {
  shuttingDown = true;
});
process.on('SIGTERM', () => {
  shuttingDown = true;
});

runLoop().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[growlog-worker] fatal:', e);
  process.exit(1);
});
