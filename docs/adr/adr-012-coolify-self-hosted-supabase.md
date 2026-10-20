# ADR-012: Coolify hosting and self-hosted Supabase

**Status:** Accepted
**Date:** 2026-10-17
**Author:** Team Growlog AI
**Related:** ADR-001, ADR-008, ADR-009, ADR-011

---

## Context

ADR-001 originally placed the web companion on Vercel and the database on Supabase Cloud. That deployment is retired:

* Supabase Cloud project `tkxhxkcrdnqfkmphfsje` is deleted.
* Vercel is not used. `@vercel/analytics` and `VERCEL_URL` are not part of the runtime.
* GitHub stores the git history only. It does not run Actions, deploys, or schema apply.

Production now runs on one Coolify server. The Next.js app and the Supabase stack are separate Coolify resources on that host. Schema changes still have to reach the database without opening Postgres to the public internet and without writing secrets into git.

---

## Decision

Growlog production hosting is Coolify on `201.18.218.242`.

| Piece | Value |
| --- | --- |
| Server | `201.18.218.242` |
| Web app | Coolify app `growlog-web` (`wwz1boqjci0e6f4jf3nd3dvn`) |
| Web build | Nixpacks, auto-deploy from `main` |
| Supabase stack | `jvxox6algazptjelglcjmyez` |
| Public API | `https://supabase.growlog.ai` |
| API alias | `supabase-growlog.staging.handlerbos.com` |
| Postgres container | `supabase-db-jvxox6algazptjelglcjmyez` |

The web app's public origin is `NEXT_PUBLIC_SITE_URL`. Local development falls back to `http://localhost:3000` when that variable is unset. There is no `VERCEL_URL` fallback.

Database, Auth, and Storage are the self-hosted Supabase stack. The canonical API URL is `https://supabase.growlog.ai`. Anon and service-role keys live in Coolify and in gitignored env files, not in the repository.

Google, Ethereum, and Solana sign-in are GoTrue providers on that Auth service. The web and mobile apps only start the Supabase flow. Provider secrets and the redirect allow-list are set on the Auth container, documented in `docs/setup/supabase-runbook.md`. They are not Next.js env vars.

### Schema apply

Migrations stay in `supabase/migrations/` and are applied in filename order by:

```bash
pnpm db:push
```

The script:

1. Reads `GROWLOG_DB_PASSWORD` from the gitignored repo-root `.env`.
2. SSHes to `root@201.18.218.242`.
3. Resolves the Postgres container's IPv4 address with `docker inspect` at runtime.
4. Opens a local SSH tunnel to that address on port 5432.
5. Runs `supabase db push --db-url … --dry-run`.
6. Applies the same command only after an explicit `y` confirmation on the terminal.

A bare `--` argument is ignored so `pnpm db:push -- --include-all` forwards `--include-all` and does not pass the separator through. The script is bash 3.2-safe: it does not expand an empty array under `set -u`.

`supabase/.temp/` is the CLI's local link cache. It is gitignored. It is not a source of truth and must not be used to point the repo back at a cloud project.

### What this decision excludes

* Vercel projects, `@vercel/analytics`, and `VERCEL_URL`.
* Supabase Cloud, including any attempt to recreate `tkxhxkcrdnqfkmphfsje`.
* GitHub Actions or any other GitHub-side deploy or migration job.
* Publishing the database port on the public interface. Operators reach Postgres through the SSH tunnel.

The background worker from ADR-008 remains a separate long-running process. Coolify auto-deploy of `growlog-web` does not start it.

---

## Consequences

* Production deploys of the web app happen when `main` updates, via Coolify. A green local build is the check available in git; GitHub will not build or deploy.
* Schema drift is fixed by adding a migration file and running `pnpm db:push` from a machine that can SSH to the server. The dry-run output is the review step. Confirmation is required because the command writes to production.
* Agents and docs must describe this topology. Reintroducing Vercel, cloud Supabase, or GitHub Actions contradicts this ADR.
* Secrets (`GROWLOG_DB_PASSWORD`, service-role key, OpenAI key) stay in gitignored `.env` / Coolify environment settings. `.env.example` records names and the public Supabase URL only.

---

## Security

* The tunnel binds to `127.0.0.1` on the operator machine.
* The database URL is passed to the Supabase CLI and is not printed.
* The container address is checked as an IPv4 address before it is placed in the SSH `-L` argument.
* RLS (ADR-009) still governs tenant data. This ADR does not open a public SQL path.
