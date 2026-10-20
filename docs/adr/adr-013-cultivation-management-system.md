ADR-013: Cultivation Management System (Electronic Grower)

Статус: Proposed
Дата: 2026-10-20
Автор: A. Safiulin, OG Lab.
Связан с: ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-009

⸻

Контекст

Лицензированная медицинская ферма должна сохранять производственные знания, стандартизировать процессы и обеспечивать непрерывность при отпуске или смене Master Grower. Документ «Master Grower | Cultivation Management System» описывает шесть взаимосвязанных артефактов:

| Документ PDF | Назначение в Growlog |
|--------------|----------------------|
| Grow Playbook | `knowledge_items` (farm-scoped, status `approved`) + структурированные пороги |
| SOP Library | `sop_definitions` + `sop_revisions` (append-only, approver) |
| Cultivation Calendar | план стадий цикла + `sop_runs` + UI календаря |
| Batch Record | `grow_cycles.batch_code` + `events` + отчёт batch record |
| Daily / Weekly Checklist | регулярные SOP + Daily Focus |
| Deviation & Incident Log | `deviations` + CAPA + эскалация |
| Change Log (технология) | `sop_revisions.reason`, `effective_from`, `approved_by` |

Growlog уже реализует event spine, SOP engine (MVP), retrieval, trust layer, voice capture с подтверждением. ADR-013 фиксирует, как довести продукт до «электронного гровера»: помощник, который опирается на утверждённую базу, а не на память одного человека.

⸻

Основное решение

1. **Источник правды — Postgres.** LLM объясняет, извлекает черновики и форматирует; канонические факты, SOP и правила попадают в БД только после подтверждения человеком (ADR-002, ADR-004).

2. **Граница «штатное / эскалация» — в коде.** Совпадение с утверждённым SOP или порогом Playbook → шаги из SOP. Иначе → ответ «нестандартно, эскалация» + push по матрице в `farms.settings.escalation_matrix`.

3. **Роли PDF → `farm_users`:** владелец = `admin`, Master Grower = `manager`, помощник = `grower`, аудитор = `viewer`. Утверждение SOP/revisions и закрытие отклонений — только `manager`/`admin` в server use cases.

4. **Критерий готовности — тест из PDF §5.** Экран «Передача смены» отвечает на 7 вопросов детерминированными SQL-запросами за 15–30 минут без звонка отсутствующему гроверу.

5. **Знания Master Grower:** интервью-режим (голос по стадиям) + импорт PDF/Docs → черновики → утверждение → версионирование.

6. **GACP:** модель данных закладывает прослеживаемость (materials/lots, harvest, QC, training, audit trail). Конкретный чек-лист TH GACP — внешний артеfact в `docs/implementation/gacp-requirements.md` (TODO от аудитора).

⸻

Новые и расширенные сущности

- `sop_revisions` — append-only тела SOP с approver и change reason
- `knowledge_items.status` — `draft` | `approved` | `retired`; retrieval только `approved` для farm playbook
- `deviations` — severity, CAPA, link to events/SOP revision
- `cycle_stage_plan` — ожидаемые даты стадий для календаря
- `materials`, `material_lots`, `harvest_records`, `qc_results`, `equipment`, `training_records` (фаза GACP)
- `playbook_thresholds` — структурированные числовые правила по стадии/метрике
- `interview_sessions` — прогресс интервью Master Grower по стадиям

⸻

Языки

Продуктовые UI и ответы ассистента: `en`, `ru`, `th`, `my` (Burmese Unicode). Переводы утверждённых SOP — производные записи с `translation_status`; канон — язык оригинала ревизии.

⸻

Датчики

`POST /api/sensors/ingest` принимает readings только для устройств с явной привязкой `scope_id` (или `zone_id` → resolve scope) в `sensor_devices.config`. Без привязки — `400 device_scope_unbound`.

⸻

Последствия

- Новые миграции в `supabase/migrations/` с RLS (ADR-009)
- Расширение SOP materialize: `stage_based`, `offset_based`, `event_based`, `manual`
- Jobs: `knowledge.import`, `cycle.lessons.draft`, `document.index` с embeddings
- pgvector на `searchable_documents` при наличии extension на хосте

⸻

Открытые вопросы

- Модель/API контроллера датчиков (адаптер)
- Официальный чек-лист тайского GACP
- Human review переводов SOP на th/my
