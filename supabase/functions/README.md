# Edge Functions

Фоновые задачи продукта остаются на `pnpm worker` (ADR-008). Каталог `supabase/functions/<name>/index.ts` пуст, пока функция не понадобится.

Деплой на self-hosted Supabase — копирование в том Coolify, не `supabase functions deploy` (тот смотрит в Supabase Cloud):

```bash
pnpm functions:deploy
pnpm functions:deploy <name>
pnpm functions:check
```

Скрипт кладёт файлы в `/data/coolify/services/jvxox6algazptjelglcjmyez/volumes/functions` и перезапускает edge runtime. Общий код — `supabase/functions/_shared` (копируется при каждом деплое). Секреты задаются на сервисе edge-functions в Coolify, не в git.

Контракт: [ADR-012](../../docs/adr/adr-012-coolify-self-hosted-supabase.md).
