# Usable grower bootstrap (ADR-013)

Before a Master Grower can upload files and use spoken assistant:

## 1. Apply schema

```bash
pnpm db:push
```

Confirms tunnel + applies `supabase/migrations/` including `20261020120000_adr013_cultivation_management_system.sql`.

Verify: `GET /api/health/adr013` (authenticated) returns `{ ready: true }`.

## 2. Background worker

On the same host as production web (Coolify), run continuously:

```bash
pnpm worker
```

Required job types for grower onboarding:

- `knowledge.import` — typed drafts from uploaded PDF/text
- `document.index` — embeddings for search

## 3. Environment

- `OPENAI_API_KEY` — import classifier, assistant, Whisper, TTS
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — worker
- `EXPO_PUBLIC_API_BASE_URL` — mobile points at web API

## 4. Smoke test

1. Settings → Playbook → upload `.txt` or PDF with text layer
2. Wait for worker; open import review drafts
3. Manager approves playbook rule + threshold
4. Assistant → mic → ask about approved rule (spoken reply)
5. Mic → log phrase → confirm card → event in timeline
