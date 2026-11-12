ADR-018: Grow Report — мини-редактор и клиентский PDF

Статус: Accepted
Дата: 2026-11-12
Автор: A. Safiulin, OG Lab.
Связан с: ADR-001, ADR-002, ADR-004, ADR-005, ADR-007, ADR-009, ADR-011

⸻

Контекст

ADR-007 зафиксировал report engine: structured blocks в `report_json`, narrative layer, curated photos, разделение audience/format, manual review «отдельным слоем над generated draft».

В продукте уже есть:

- `POST /api/reports/generate` и worker `report.generate` → `report_json`, HTML stub в Storage;
- мобильный пункт Reports в More;
- паттерн PDF на устройстве (`expo-print`) для nutrient recipes.

Пользователи хотят **Grow Report**: красивый PDF за выбранный период (сенсоры, фото, события), с **личными комментариями** (вступление, заметки к событиям и секциям), мотивацию вести журнал аккуратно и возможность отправить руководителю или опубликовать.

⸻

Основное решение

### 1. Grow Report — продуктовый пресет, не новый `report_type`

Grow Report моделируется как:

| Ось | Значение |
|-----|----------|
| `report_type` | `cycle` (шаблон ADR-007 Cycle / Public Grow Report) |
| `audience_type` | `archive_personal`, `internal_management` или `public_community` |
| `output_format` | `pdf` (intent для UX; bytes генерируются на клиенте) |
| Период | Явное окно `period_start` / `period_end` (пресеты: 7d, 30d, whole cycle, custom) |
| Scope | `farm_id`, `cycle_id`, `scope_id` из активного контекста (ADR-005) |

Новый канонический `report_type` не вводится.

### 2. Два слоя данных на `reports`

| Поле | Владелец | Содержимое |
|------|----------|------------|
| `report_json` | Worker `report.generate` | Фактические и AI-блоки ADR-007 (+ `sensor_trends`, `activity`) |
| `editor_json` | Пользователь через API (RLS) | Комментарии, заголовок, вступление/заключение, скрытые блоки/фото |

Правила:

- Worker **никогда не перезаписывает** `editor_json`.
- Повторная генерация обновляет только `report_json`; пользовательские правки сохраняются.
- Ключи редактора — **стабильные id**, не индексы массива: `block:{kind}`, `event:{uuid}`, `media:{uuid}`.

Схема: `reports.editor_json jsonb not null default '{}'`.

### 3. Trust layer для автора

Текст пользователя в `editor_json` всегда помечается в UI и PDF как **author_comment** — не смешивается с `observed_fact`, `derived_metric`, `ai_generated`.

Для `public_community` к pipeline ADR-007 добавляется sanitization **и комментариев автора** (те же правила, что `sanitizePublicText`).

### 4. Новые block kinds в `report_json`

Аддитивно к ADR-007:

- **`sensor_trends`**: daily min/avg/max по метрикам за окно (`environmental_daily_stats`, fallback — агрегация `sensor_readings`).
- **`activity`**: счётчик событий по календарным дням фермы.

В `timeline_highlights` и `anomalies` — опциональный `eventId` для привязки заметок редактора.

### 5. PDF на клиенте (MVP)

- Общий **pure** модуль в `packages/domain`: `buildGrowReportView` + `renderGrowReportHtml` + inline SVG charts.
- Mobile: signed URLs → resize (`expo-image-manipulator`) → base64 в HTML → `expo-print` → share.
- Web companion: browser print / Save as PDF (тот же HTML-шаблон) — optional follow-up.

Серверный PDF (headless Chromium в worker, бинарь в `report_artifacts`) — **вне MVP**. Условие включения: единый артефакт для публикации без клиента; отдельная миграция jobs `report.render.pdf` (ADR-008).

### 6. Точка входа (mobile)

Отдельный пункт **Grow Report** в More → stack `/(tabs)/more/grow-report` (не путать с generic Reports).

### 7. API

- Существующий: `POST /api/reports/generate`.
- Новый: `PUT /api/reports/:id/editor` — bearer + user-scoped Supabase (RLS), только `editor_json`, валидация `parseEditorLayer` в domain.

⸻

MVP scope

В MVP:

- Mobile: setup периода, сборка через worker, мини-редактор, PDF share.
- Блоки: header, executive summary, metrics, sensor trends (SVG), activity, timeline, anomalies, SOP, photos, narrative, missing data + author layer.
- Limit editor: длины строк, max keys (deterministic).

Вне MVP (зафиксировано):

- Публичная grow page / share link;
- Server PDF в Storage;
- Полноценный web-редактор;
- `story_block` → narrative merge (ADR-004);
- Публикация на внешние платформы.

⸻

Итог

Grow Report — пресет `cycle` + client PDF: worker собирает grounded `report_json`, пользователь дополняет `editor_json`, domain склеивает view и рендерит печатный HTML; PDF создаётся на устройстве без weakening RLS.
