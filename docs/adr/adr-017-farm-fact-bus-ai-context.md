# ADR-017: Farm fact bus and AI context contract

Статус: Accepted  
Дата: 2026-11-09  
Связан с: ADR-002, ADR-003, ADR-004, ADR-008, ADR-014, ADR-016

## Контекст

Операционные данные фермы пишутся в несколько таблиц. AI (голосовой ассистент, Daily Focus, отчёты) должен собирать **единый контракт контекста** без ad-hoc запросов в UI. ADR-003 описывает retrieval pipeline; этот ADR фиксирует **шину записи** и **контракт чтения** для модели.

## Решение: три полосы записи

### 1. Timeline spine — `events`

- Канонические пользовательские и системные факты с датой → строка в `events` + деталь при необходимости.
- Запись **только** через security-definer RPC / use case, в той же транзакции вызывающий `enqueue_standard_event_jobs` (ADR-008): `document.index`, `timeline.daily.refresh`, `focus.refresh`.
- Исключения (допустимы, но не для «тихой» истории):
  - **Sensor lane** (см. ниже) — высокочастотные замеры без события на каждую точку.
  - Чистая конфигурация без operational смысла (рецепты НПК до применения).

### 2. Sensor lane — `sensor_readings` → `environmental_daily_stats`

- Авто-замеры (Tuya, ingest API, ручной ввод с reading) → `sensor_readings`.
- Проекция для AI и графиков: `environmental_daily_stats` (worker `snapshot.refresh`).
- Отдельной таблицы `sensor_snapshots` в прод-схеме **нет** (см. implementation drift в ADR-002/008).
- Событие `sensor_snapshot` — только при явной фиксации в ленте (ручной RPC, ingest с event, mobile journal без reading).
- Пороговые отклонения → `deviations` и при публикации **одно** событие `anomaly` / `issue_detected` (dedup), с enqueue.

### 3. Config lanes

- `farms`, `scopes`, `grow_cycles`, `plants`, `sop_definitions` / `sop_revisions`, `nutrient_recipes` — состояние конфигурации.
- AI **читает** их в слое `farm_profile` и `cycle_brief`; значимые переходы (стадия, harvest, SOP execute) → `events` + jobs.
- SOP intake (ADR-016) пишет definitions; после commit — `document.index` для `sop_definition` в `searchable_documents`.

## Контракт чтения: `FarmContextPack`

Нормализованный объект для LLM (расширяет ADR-003). Стабильные ключи:

| Слой | Источник | Назначение |
|------|----------|------------|
| `farm_profile` | `farms`, `scopes`, активные циклы | Кто/где/настройки |
| `cycle_brief` | цикл, растения, свет, кормления, журнал, датчики | Текущий цикл |
| `timeline` | `recent_events`, `anomaly_context`, `daily_timelines` | Лента и аномалии |
| `sensors` | `environmental_daily_stats`, `sensor_readings` / brief | Климат |
| `feeding` | `grow_cycle_feeding_entries`, тренд 7d | НПК / полив |
| `sop` | `sop_runs`, approved procedures, searchable `sop_definition` | Регламенты |
| `photos` | `photo_context`, `photo_timeline_signals` | Визуальные сигналы |
| `history` | прошлые циклы (сводки), approved `grow_memory_items`, pattern insights | Аналоги |
| `knowledge` | `searchable_documents` | Проф. контекст |
| `missing_data`, `guardrails` | детерминированный слой | Безопасность |

**Приоритет слоёв в prompt:** Immediate → Current cycle → History → Knowledge (ADR-003).

**Daily Focus** хранится в `ai_insights` (`insight_type = daily_focus`), не в `daily_focus_cards` (таблица не развёрнута). Генерация: worker `focus.refresh` → тот же `assembleAnswerContext` + trust layer (ADR-004).

## Intent → обязательные слои (MVP)

| Intent | Assistant mic | Focus refresh |
|--------|---------------|---------------|
| `status` | brief, timeline, sensors | brief, timeline, sensors, sop |
| `action` | + sop, feeding, knowledge | + sop overdue |
| `causal` | + history, photos, causal_links | anomalies |
| `daily_focus` | sop, timeline, sensors | все operational |
| `planning` / `report` | + history, knowledge | — |

## API surfaces

- `POST /api/assistant/ask` — полный pack, `context_manifest` в ответе.
- Worker `focus.refresh` — pack за локальный день фермы, upsert `ai_insights` с grounding.
- Голос: транскрипт → intent router → `ask` или `extract` + confirm → новые `events` → последующие ask видят факты.

## Не-цели

- Обязательный vector search.
- Отдельный message bus (Kafka); Postgres + jobs достаточно.
- Запись LLM в канонические таблицы без RPC.

## Implementation drift (на момент принятия)

См. [assistant-cycle-context.md](../implementation/assistant-cycle-context.md). Закрывается задачами: enqueue на lifecycle/SOP RPC, sensor deviation events, mobile sync через RPC, SOP index, retrieval layers `farm_profile` / `history` / prompt budget.

## Последствия

- Один контракт для ask, focus, отчётов.
- Тестируемость retrieval без LLM.
- Дисциплина: новый writer обязан либо `events`+jobs, либо явно документирован как config/sensor lane.
