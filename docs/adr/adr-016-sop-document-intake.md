ADR-016: SOP Document Intake (paste / file → structured definition)

Статус: Proposed
Дата: 2026-10-30
Автор: A. Safiulin, OG Lab.
Связан с: ADR-002, ADR-004, ADR-006, ADR-013

⸻

Контекст

SOP в Growlog — это не PDF, а цепочка `sop_definitions` → `sop_triggers` → `sop_assignments` → `sop_runs` (ADR-006). Ручной экран создаёт минимальный daily SOP. В ADR-002 уже есть `sop_documents` и `sop_definitions.document_id` для загруженных документов, но продуктовый поток «вставил текст / файл → готовый регламент» не был зафиксирован.

CMS-импорт (`knowledge.import`) режет документы на playbook-черновики и при совпадении может предложить ревизию существующего SOP; он не извлекает триггеры и расписание. Пользователям нужен быстрый путь на экране SOP без обхода меню.

⸻

Основное решение

1. **Источник правды — Postgres после подтверждения человеком.** LLM возвращает только JSON-черновик; канонические строки — те же таблицы `sop_*`, что и при ручном создании (ADR-013, ADR-004).

2. **Контракт черновика** выровнен с use case `create_sop_definition` (data-platform spec): title, instructions, `required_inputs_after_execution`, criticality, triggers[].

3. **Allowlist триггеров** = типы, которые детерминированно исполняет `evalTrigger` в SOP engine на момент ADR: `recurring_daily`, `recurring_interval`, `date_based`, `stage_based`, `offset_based`, `time_based`. Прочие типы из ADR-006 не сохраняются как активные триггеры при импорте. Текст попадает в `schedule_unparsed` и сохраняется на `sop_definitions.schedule_unparsed`, а не только на экране review.

4. **Валидация в коде.** `trigger_config` проверяется по типу и хранит только ключи, которые читает движок (время `HH:MM`, целые дни, реальные календарные даты, стадии, offset, опциональный `label` у `date_based`). Невалидные триггеры отбрасываются, не «тихо» подменяются. Лишние ключи отбрасываются.

5. **Назначение** — только `farm_id`, `cycle_id`, `scope_id` из уже выбранного UI-контекста, не из текста документа. `applies_to_scope` берётся из документа только если это один из типов scope. Иначе черновик помечается `applies_to_scope_unconfirmed`, review подставляет открытый scope и показывает предупреждение. Commit отклоняет пустое значение. Тип `tent` по умолчанию не подставляется.

6. **`sop_runs` не создаёт импорт и не создаёт модель.** Materialize — существующий engine.

7. **Один документ → несколько definitions.** Одна строка `sop_documents` с `parsed_text`; каждое подтверждённое определение ссылается на `document_id`.

8. **PDF без текстового слоя** — отказ с просьбой вставить текст; OCR/vision — вне MVP.

⸻

Не-цели

- Замена approver-flow `sop_revisions` для изменения уже утверждённых тел SOP (импорт = новые definitions).
- Авто-публикация без review.
- Создание или закрытие `sop_runs` моделью.
- Полный визуальный редактор всех полей SOP (остаётся `/sop/new` и будущий редактор).

⸻

API (implementation)

- `POST /api/sop/import-preview` — extract text, model JSON, validate; без записи в БД. Ошибка проверки дубликата — ошибка preview, а не «дубликата нет».
- `POST /api/sop/import-commit` — повторная валидация, затем одна транзакция `commit_sop_document_import`: `sop_documents`, definitions, triggers, assignments и постановка `document.index` под RLS сессии пользователя. Сбой индексации откатывает запись целиком.
- `sop_documents.metadata.content_hash` (SHA-256 текста) — предупреждение о повторном импорте; commit с `allowDuplicate: true` после явного подтверждения в UI. Повторная проверка хеша внутри транзакции берёт advisory lock, чтобы два параллельных commit одного текста не прошли оба.
- Preview UI: правка title, description, steps, daily time; локализованные коды ошибок.
- **UI обязан показывать явный шаг review до commit и панель success после commit** (список сохранённых названий, без silent persist и без немедленного сброса preview).

⸻

Последствия

- Новый доменный модуль валидации черновика (тестируемый без AI).
- Строки i18n на веб-экране SOP.
- Ссылка из ADR-006 на политику authoring.
