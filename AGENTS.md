# Growlog AI — agent notes

Mobile-specific Expo notes live in `apps/mobile/AGENTS.md`. Domain rules live in `docs/adr/` and `.cursor/rules/`.

## Production infrastructure

This is the current hosting map (ADR-012). Do not propose the retired stack.

* **Server:** Coolify on `201.18.218.242`.
* **Web:** Coolify app `growlog-web` (`wwz1boqjci0e6f4jf3nd3dvn`). Nixpacks. Auto-deploy from `main`.
* **Worker:** Coolify app `growlog-worker` (`q7fhmyc0jamuhm2q8iuyozlc`). `Dockerfile.worker`, `pnpm worker`, health `GET /health` on port 8080, no public domain. Auto-deploy from `main` when worker paths change. The web app does not start this process.
* **Data plane:** self-hosted Supabase stack `jvxox6algazptjelglcjmyez`.
* **API origin:** `https://supabase.growlog.ai` (alias `supabase-growlog.staging.handlerbos.com`).
* **Postgres container:** `supabase-db-jvxox6algazptjelglcjmyez`. Its IP is resolved at tunnel time; do not hardcode it.
* **GitHub:** git storage only. No GitHub Actions. Do not add workflow files that deploy or apply schema.
* **Not in use:** Vercel, `@vercel/analytics`, `VERCEL_URL`, Supabase Cloud project `tkxhxkcrdnqfkmphfsje` (deleted).

Canonical web origin is `NEXT_PUBLIC_SITE_URL`. If it is unset, local code uses `http://localhost:3000`.

## Schema

* Migrations are the files in `supabase/migrations/`, applied in filename order.
* Apply them with `pnpm db:push`. The script reads `GROWLOG_DB_PASSWORD` from gitignored `.env`, opens an SSH tunnel to `root@201.18.218.242`, dry-runs `supabase db push --db-url`, then applies when the Supabase CLI confirms (when the dry-run lists work). An up-to-date database exits without a prompt.
* Do not commit `supabase/.temp/` or any `.env` file. `.env.example` has the public URL and empty secrets.

## Edge Functions

There are none yet. Background work stays on `pnpm worker`. When a function lands in `supabase/functions/<name>/index.ts`, deploy it with `pnpm functions:deploy` (file copy into the Coolify volume plus edge-runtime restart). `supabase functions deploy` targets Supabase Cloud and does not update this stack. Check drift with `pnpm functions:check`.

## Product rules that still hold

* Database-backed farm data is the source of truth. Do not invent `farm_id`, `cycle_id`, or `scope_id`.
* Keep ADR-002 names: `farms`, `grow_cycles`, `scopes`, `events`, `sensor_readings`, `media_assets`, `sop_*`, `ai_insights`, `reports`, `knowledge_*`.
* Time-based facts belong on `events` or a documented projection.
* Access control, retrieval gates, trust checks, and publish boundaries stay in code.
* Nutrient solution calculator: ADR-014 (`docs/adr/adr-014-nutrient-calculator.md`), pure solver in `packages/nutrient-calc`.
* Digital grower skills: ADR-015 (`docs/adr/adr-015-digital-grower-skills.md`); leaf hypothesis matcher in `packages/domain/src/growlog/leaf-skill/`.
* Grow Report editor + client PDF: ADR-018 (`docs/adr/adr-018-grow-report-editor-pdf.md`); domain helpers under `packages/domain/src/growlog/grow-report/`.
