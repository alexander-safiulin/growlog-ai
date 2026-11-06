# Assistant cycle context (retrieval MVP)

Статус: Draft  
Связан с: ADR-002, ADR-003, ADR-008, [sensor-controller-adapter.md](./sensor-controller-adapter.md)

## Где живут факты

Операционная история — Postgres (self-hosted Supabase). Лента = `events` + детальные таблицы (`grow_cycle_feeding_entries`, `sensor_readings`, …). Векторный индекс (`searchable_documents` + pgvector) только дополняет семантический поиск по knowledge/memory, не заменяет SQL по циклу.

## Форма данных для рассуждения ассистента

| Слой | Таблица | Роль в `/api/assistant/ask` |
|------|---------|------------------------------|
| Raw | `sensor_readings` | Точечные замеры; в промпт только если нет агрегатов |
| Derived | `environmental_daily_stats` | min/max/avg за день — основной «график» в MVP |
| ADR-002 (не заполнена в коде) | `sensor_snapshots` | Зарезервировано; сейчас роль выполняют дневные статы |

`cycle_brief` в retrieval ([lib/growlog/retrieval/fetch-cycle-brief.ts](../../lib/growlog/retrieval/fetch-cycle-brief.ts)) всегда подгружается при выбранном `cycle_id`: растения, свет, последние поливы с `solution_snapshot`, журнал без `sensor_snapshot`, дневные статы и последнее значение по каждой метрике.

## Tuya / VPD

Живой список SmartLife по-прежнему только экран. Назначенные воздух и влажность воркер пишет в `sensor_readings` раз в 15 минут, без события в ленте. Прикидка «что если» на карточке в базу не попадает.

Если у цикла несколько комнат и вопрос идёт из одной, бриф содержит `other_scopes_not_loaded`: заметки и датчики остальных комнат в этот ответ не загружены.

## Derived jobs после полива

`create_grow_cycle_feeding_log` ставит `enqueue_standard_event_jobs` (индекс события, daily timeline, focus), как `create_log_entry` и ingest датчиков. Worker: `pnpm worker`.
