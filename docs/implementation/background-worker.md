# Background worker

ADR-008 jobs and the 15-minute climate sample run in one process: `pnpm worker` ([scripts/background-worker.ts](../../scripts/background-worker.ts)).

Coolify application `growlog-worker` (`q7fhmyc0jamuhm2q8iuyozlc`), separate from `growlog-web`:

- Build: Dockerfile `Dockerfile.worker`, context repo root
- Start command: image `CMD` (`pnpm worker`)
- Port: `8080`
- Health check: `GET /health`
- No public domain
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`, `TUYA_API_BASE`
- Optional: `WORKER_POLL_MS` (default 1000)

`growlog-web` does not start this process. Without it, raw rows stay in the database and `background_jobs` stay pending.
