# Supabase Runbook — Growlog AI

Продакшен — self-hosted Supabase на Coolify, не Supabase Cloud. Решение зафиксировано в [ADR-012](../adr/adr-012-coolify-self-hosted-supabase.md).

| Компонент | Значение |
| --- | --- |
| Сервер | `201.18.218.242` |
| Стек | `jvxox6algazptjelglcjmyez` |
| API | `https://supabase.growlog.ai` |
| Алиас | `supabase-growlog.staging.handlerbos.com` |
| Контейнер Postgres | `supabase-db-jvxox6algazptjelglcjmyez` |
| Web | Coolify app `growlog-web` (`wwz1boqjci0e6f4jf3nd3dvn`), Nixpacks, auto-deploy из `main` |

Cloud-проект `tkxhxkcrdnqfkmphfsje` удалён. Vercel не используется. GitHub хранит код и не запускает Actions.

Ключи anon и service role лежат в окружении Coolify и в локальном gitignored `.env`. В репозиторий их не кладут.

## 1. Локальное окружение

```bash
cp .env.example .env
```

Заполните в `.env`:

- `NEXT_PUBLIC_SUPABASE_URL` — уже `https://supabase.growlog.ai` в примере
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (только сервер и `pnpm worker`)
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SITE_URL` — публичный origin web-приложения. Пустое значение в локальной разработке даёт `http://localhost:3000`. Fallback `VERCEL_URL` нет.
- `GROWLOG_DB_PASSWORD` — пароль Postgres, нужен только для `pnpm db:push`

Next.js дополнительно читает `.env.local`, если файл есть. `pnpm db:push` читает пароль только из `.env`.

## 2. Миграции

Канонический способ применить схему на прод — с машины, у которой есть SSH к `root@201.18.218.242`:

```bash
pnpm db:push
```

Скрипт `scripts/db-push.sh`:

1. Берёт `GROWLOG_DB_PASSWORD` из `.env`.
2. По SSH узнаёт текущий IPv4 контейнера `supabase-db-jvxox6algazptjelglcjmyez` (`docker inspect`). IP не хардкодится.
3. Поднимает туннель на `127.0.0.1` (по умолчанию порт `15432`).
4. Запускает `supabase db push --db-url … --dry-run`.
5. Спрашивает подтверждение в терминале и только потом выполняет `supabase db push --db-url …`.

Нужны `ssh` и Supabase CLI в `PATH`. Голый аргумент `--` игнорируется, поэтому дополнительные флаги CLI передаются так:

```bash
pnpm db:push -- --include-all
```

Они попадают и в dry-run, и в применение. Отмена на вопросе `[y/N]` ничего не записывает в базу.

Не коммитьте `supabase/.temp/` — это локальный кэш CLI, не источник правды.

Файлы в `supabase/migrations/` применяются **в порядке имени** (13 файлов):

1. `20260322120000_foundation_mvp.sql`
2. `20260322140000_sop_phase3.sql`
3. `20260322150000_ai_advisor_phase4.sql`
4. `20260322160000_adr002_mvp_adr009_membership_adr008_jobs.sql`
5. `20260322170000_adr_foundation_hardening.sql`
6. `20260322180000_adr_worker_and_usecase_contracts.sql`
7. `20260322190000_photo_pipeline_adr010.sql`
8. `20260322200000_sop_engine_hardening.sql`
9. `20260322210000_adr004_story_block_insight_type.sql`
10. `20260322220000_reports_adr007.sql`
11. `20260322220100_insert_ai_insight_with_grounding_rpc.sql`
12. `20260323000000_phase_bc_extensions.sql`
13. `20260324000000_mobile_push_tokens.sql`

## 3. Auth

В Studio этого self-hosted стека:

1. Authentication → Providers → **Email** — включите.
2. (Опционально) отключите подтверждение email для локальной разработки.

Google использует тот же Supabase Auth, что и email. Первый успешный вход создаёт пользователя, если signup включён. Ферма по-прежнему создаётся на `/onboarding`. Секреты провайдера живут на контейнере Auth (GoTrue), не в Next.js. Вход через Ethereum и Solana в интерфейсе выключен.

На сервисе Auth стека `jvxox6algazptjelglcjmyez` (те же флаги, что в Handler):

```bash
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<google oauth client id>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<google oauth client secret>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://supabase.growlog.ai/auth/v1/callback
```

В Google Cloud redirect URI — `https://supabase.growlog.ai/auth/v1/callback`.

В Auth **Site URL** и **Redirect URLs** должны быть origin'ы, с которых входят:

- публичный origin web (`NEXT_PUBLIC_SITE_URL`), путь `/auth/callback`
- `http://localhost:3000/auth/callback` для локальной разработки
- `growlog://**` для мобильного Google (схема из `apps/mobile/app.json`)

## 4. Storage

Миграция `foundation_mvp` создаёт bucket **`media`** с RLS по `farm_id` в пути объекта.

Проверьте в Studio: Storage → bucket `media` существует и **не public** (доступ через signed URL / policies).

## 5. Проверка env перед запуском

Убедитесь, что `.env` из шага 1 заполнен. Клиент и API читают `NEXT_PUBLIC_SUPABASE_URL` и anon key. Worker и серверные маршруты читают `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Запуск

```bash
pnpm install
pnpm dev          # терминал 1
pnpm worker       # терминал 2 — обязателен для фото и derived data
```

## 7. Первый пользователь

1. `/auth/login` — email + password или Google.
2. `/onboarding` — имя фермы, timezone, цикл.
3. Запишите голосовую заметку на `/log` — в таймлайне появится событие.
4. Загрузите фото на `/photos` — worker выполнит `photo.analyze`.

## 8. Sensor ingest (устройства)

1. В Supabase создайте строку в `sensor_devices` (или через UI позже).
2. В `config` устройства укажите `"ingest_token": "your-token"` или задайте глобальный `SENSOR_INGEST_SECRET`.
3. `POST /api/sensors/ingest` с телом `{ deviceId, metricCode, value, capturedAt? }` и заголовком `X-Sensor-Token`.

## 9. Integration tests

```bash
# Получите access token залогиненного пользователя (DevTools → Application → Supabase session)
export INTEGRATION_TEST_ACCESS_TOKEN=...
pnpm test:integration
```

## 10. Production checklist

- [ ] Web выкатывается Coolify-приложением `growlog-web` из `main` (Nixpacks). Отдельный Vercel-проект не заводить.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` в Coolify равен `https://supabase.growlog.ai`.
- [ ] `NEXT_PUBLIC_SITE_URL` в Coolify равен публичному origin web-приложения.
- [ ] Worker запущен отдельным долгоживущим процессом на том же сервере или другом хосте с service role. Auto-deploy `growlog-web` его не стартует. Long-poll worker не прятать в serverless.
- [ ] Новые SQL-файлы попадают в `supabase/migrations/` и применяются через `pnpm db:push` (сначала смотреть dry-run).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` и `GROWLOG_DB_PASSWORD` только на сервере, в Coolify env или в gitignored `.env`.
- [ ] `OPENAI_API_KEY` только на сервере.
- [ ] RLS включён на всех tenant-таблицах (миграции делают это по умолчанию).
- [ ] Postgres не опубликован в интернет; доступ к нему — SSH-туннель из `pnpm db:push`.
