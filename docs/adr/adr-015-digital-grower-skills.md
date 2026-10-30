ADR-015: Digital Grower — Skills, Not a Free Agent

Статус: Accepted (leaf skill wired: photo.analyze, confirm API, mobile timeline UI)
Дата: 2026-10-30
Автор: A. Safiulin, OG Lab.
Связан с: ADR-001, ADR-003, ADR-004, ADR-005, ADR-006, ADR-010, ADR-011, ADR-014

---

## Контекст

Growlog обещает «электронного гровера»: совет и напоминания, опирающиеся на **весь контекст фермы** — журнал, датчики, фото, SOP, прошлые циклы (`ADR-001`, `ADR-003`).

Уже есть:

- **Retrieval-first assistant** — `assembleAnswerContext` + `pages/api/assistant/ask.ts` (`ADR-003`, `ADR-004`).
- **Daily Focus** — карточки SOP из `sop_runs` + narrative из derived jobs (`ADR-006`, `ADR-008`).
- **Photo pipeline** — `photo.analyze` → `photo_analysis` + optional deviation (`ADR-010`).
- **Golden action** — центральный микрофон / ассистент (`ADR-005`).

Пользователь хочет **упакованные компетенции** (например, «что на листе»), а не свободный chatbot, который выдумывает дефициты. Параллельно — SOP-напоминания только из реальных регламентов, не из фантазии модели.

---

## Проблема

Без явного контракта:

1. `photo.analyze` возвращает свободные `issues_detected` с кодами, которые модель придумывает сама.
2. Появится соблазн подключить **OpenAI Agents SDK**, Grok-style web agents или **Plant.id / PlantNet** — они не видят journal spine и ломают trust model.
3. Daily Focus может «придумать» задачи (осушитель 1-го числа), которых нет в `sop_runs`.
4. `deficiency_suspected` в timeline станет следствием галлюцинации, а не подтверждённого наблюдения.

---

## Решение

**Digital Grower = существующие поверхности + versioned skills.**

| Поверхность | Роль |
| --- | --- |
| Центральный микрофон / вкладка Assistant | Вопрос гровера, голос, позже — явный запуск skill |
| Daily Focus | Детерминированные SOP runs + narrative только по retrieval |
| Photo capture | Raw media + optional skill pipeline |

**Skill** — чистый контракт (вход → выход), deterministic matching в коде, LLM только для **заполнения закрытой карточки наблюдения** и **формулировки** уже отобранных гипотез.

```text
Photo + journal context → observation card (LLM, closed schema)
                        → matchHypotheses (pure TS, tested table)
                        → 2–3 hypotheses + one next step (ADR-004 trust)
                        → user confirms before any timeline fact
```

### Что НЕ делаем (MUST NOT)

- **OpenAI Agents SDK** / autonomous tool loops / browsing as core architecture.
- **Plant.id, PlantNet, PlantCV-as-diagnosis** — species ID и pixel metrics без farm journal не являются deficiency engine.
- **Новый `deficiency_suspected` event** из model output без user confirm.
- **SOP reminders** не из `sop_runs` / `sop_engine`.

Провайдер LLM остаётся pluggable (сейчас OpenAI в worker/API); skills не привязаны к одному SDK.

### Skill v1: Leaf (`leaf_diagnosis_v1`)

Реализация: `packages/domain/src/growlog/leaf-skill/` (pure TS, как `@growlog/nutrient-calc`).

1. **Observation card** — только перечисленные поля (`LeafObservationCard`); пустое = «не видно».
2. **Hypothesis table** — mobile vs immobile nutrient patterns + non-deficiency lookalikes; scoring в коде.
3. **Journal context** — pH, EC, последняя подкормка из переданных фактов retrieval (не выдумывается).
4. **Output** — ranked hypotheses, `missing_data`, один `next_step` (спросить pH / снять куст / записать измерение).
5. **Persistence** — structured insight (`ADR-004`); journal event только после confirm UI.

Хранение JPEG: `ADR-010` (long edge ≤ 2048) достаточно для vision fill-in карточки.

### Skill v2 (later): SOP buddy

Уже покрыто engine: materialize → `sop_runs` → Daily Focus cards. LLM may **summarize** open/overdue runs, MUST NOT invent new obligations. Уточнение в derived-data prompt — отдельная задача.

### Mobile «глаз» на микрофоне

`MicTabButton` long-press — UX preview only до wiring skill capture; skill launch MUST resolve `farm_id`, `cycle_id`, `scope_id` before persist (`ADR-010`, `ADR-002`).

---

## Trust и timeline

- Факт / интерпретация / гипотеза / действие — `ADR-004`.
- Skill output: `insight_type` ∈ assistant schema; `hypotheses[]` из таблицы; `grounding` на `media_asset` + journal rows.
- Photo deviation from free `photo.analyze` — legacy path; leaf skill MUST NOT auto-create deviation until product replaces v0 analyze prompt.

---

## Версионирование

- `LEAF_SKILL_VERSION = 'leaf_diagnosis_v1'` — меняется при смене таблицы или карточки; тесты golden в `tests/unit/leaf-skill.test.ts`.
- Новый skill — новый каталог + version constant + ADR appendix или новый ADR при смене spine.

---

## Implementation map

| Artifact | Path |
| --- | --- |
| ADR | `docs/adr/adr-015-digital-grower-skills.md` |
| Leaf table + matcher | `packages/domain/src/growlog/leaf-skill/` |
| Unit tests | `tests/unit/leaf-skill.test.ts` |
| Confirm hypothesis | `pages/api/assistant/confirm-leaf-hypothesis.ts` → `deficiency_suspected` after user tap |
| Photo worker | `lib/growlog/photo-pipeline.ts` + `leaf-skill-vision.ts` |
| Mobile UI | `LeafDiagnosisPanel` in `EventDetailSheet` |

---

## Summary

Электронный гровер — не отдельный агент, а **навыки** поверх retrieval, SOP engine и trust layer. Первая компетенция — лист: таблица гипотез в коде, модель заполняет карточку, пользователь подтверждает факты. SOP-напоминания остаются за `ADR-006`.
