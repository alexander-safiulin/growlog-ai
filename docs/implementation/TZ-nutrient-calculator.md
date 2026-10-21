# ТЗ: модуль калькулятора питательных растворов (Nutrient Calculator)

**Статус:** Draft  
**Дата:** 2026-10-21 (Asia/Bangkok)  
**Автор:** A. Safiulin / Growlog AI  
**Репозиторий:** https://github.com/alexander-safiulin/growlog-ai (`main`)  
**ADR:** ADR-014 (`docs/adr/adr-014-nutrient-calculator.md`)  
**Материалы анализа Hydroodo:** `supabase/seed/nutrient/reference/hydroodo/`, `supabase/seed/nutrient/README.md`  
**Связанные задачи:** `docs/implementation/nutrient-calculator-agent-tasks.md`

---

## 1. Цель продукта

Дать гроверу в Growlog AI (web companion Next.js + mobile Expo) инструмент уровня Hydroodo/HydroBuddy:

1. Подобрать дозы удобрений под **целевой раствор** (мг/л по элементам) с учётом **воды источника**, **объёма**, **допусков**, ограничений **NH₄** и схемы **A/B**.
2. В обратном режиме посчитать **фактический состав** по заданным дозам.
3. Оценить **EC**, отклонения по элементам, соответствие допускам.
4. Сохранять **рецепты** на ферму/цикл/растение и при желании писать в журнал (`events.feeding`).
5. Показывать **происхождение данных** (provenance) — без «магических» ppm из ниоткуда.

Критерий качества: на golden-кейсах Hydroodo наш solver даёт **не худший** weighted error в пределах тех же tolerance corridors.

---

## 2. Контекст репозитория (обязательные конвенции)

Изучено по `main` через cursor-github (`get_git_tree` / `get_file_contents`).

| Область | Факт |
|--------|------|
| Monorepo | `pnpm@10`, workspace `packages/*`, `apps/*` |
| Web | Next.js 15 в корне (`growlog-web` на Coolify), не Vercel |
| Mobile | `apps/mobile` Expo Router, primary client (ADR-011) |
| Domain | `packages/domain` (`@growlog/domain`), pure helpers e.g. `sop-engine-pure.ts` |
| API | `packages/api-client` |
| DB | self-hosted Supabase; миграции `supabase/migrations/`; apply **`pnpm db:push`** (SSH tunnel + confirm); **нет** GitHub Actions deploy |
| ADR | `docs/adr/adr-0XX-*.md`; последний: **013** → этот модуль = **014** |
| Specs | `docs/implementation/*.md` |
| Agent notes | `AGENTS.md`, `.cursor/rules/*.mdc` |
| Domain names | ADR-002: `farms`, `grow_cycles`, `scopes`, `events`, `plants`, `knowledge_*`, … |
| GACP materials | ADR-013: `materials`, `material_lots` (farm inventory) — **не** путать с global fertilizer catalog |
| RLS | ADR-009: `farm_id` + `user_farm_ids()`; global dictionaries — явное исключение |
| i18n | `lib/i18n/messages/*`; `LOCALES` + `PRODUCT_LOCALES` = `en,ru,th,my`; `pnpm check-i18n` |
| Tests | root Vitest: `tests/unit/**/*.test.ts`, `tests/integration/**`; `pnpm test` |
| Hosting | ADR-012 Coolify + supabase.growlog.ai |

**Правила, которые ТЗ не ломает:**

- Не выдумывать `farm_id` / `cycle_id` / `scope_id`.
- Domain logic не дублировать в screen files.
- LLM не пишет критичные факты без подтверждения; calculator — **детерминированный код**, не LLM.
- Не коммитить `.env`, `supabase/.temp/`.

---

## 3. Пользовательские сценарии

### UC-1. Подбор доз (forward)

1. Выбрать farm (контекст уже есть).
2. Выбрать/создать target profile (из библиотеки или вручную ppm).
3. Опционально вычесть water profile.
4. Отметить набор удобрений (global + farm custom).
5. Задать объём (л), режим single tank или A/B, concentration factor, NH₄ max share, min match %.
6. Нажать «Рассчитать» → doses, table System vs Components, deviations, EC, warnings.
7. Сохранить recipe; опционально «Записать в журнал» → `events` feeding.

### UC-2. Обратный расчёт (reverse)

Ввести дозы → получить ppm/mmol/meq, EC, сравнение с optional target.

### UC-3. Кастомное удобрение

Пользователь вводит бренд/имя/% с этикетки → помечается `user-entered`; oxide conversion через канонические factors; badge «Пользовательское».

### UC-4. Источники данных

Страница со списком sources: тип, license, counts (fertilizers/profiles), last retrieved_at, verification status. Клик → сущности с этим source.

### UC-5. Mobile field use

На ферме: выбрать сохранённый recipe / быстрый calc → показать дозы на текущий объём бака → отметить feeding.

---

## 4. Функциональные требования

### 4.1 Элементы и формы

Обязательные элементы цели: **N-NO₃, N-NH₄**, P, K, Ca, Mg, S, Fe, Mn, Zn, Cu, B, Mo.  
Опциональные: N-NH₂ (urea), Cl, Na, Si, Co.

Declared label forms: N, NO₃, NH₄, NH₂, P₂O₅, K₂O, Ca, CaO, Mg, MgO, S, SO₃, SO₄, микроэлементы, chelates — как в Hydroodo `components_declared.csv`.

### 4.2 Единицы доз

- Порошки: **г/л** (и г на объём V).
- Жидкости: **мл/л** (и мл на V); label % трактовать как **% w/v** для liquids и **% w/w** для solids (как HydroBuddy post-1.9 / Hydroodo practice); density не обязателен, если нет cross-unit.

### 4.3 Вода источника

Профиль: ppm по тем же элементам + опц. HCO₃/щелочность (для будущих pH/alkalinity features; P1 — только elemental subtract).

### 4.4 Допуски (defaults = Hydroodo `overdose.csv`)

| Group | Max overdose % |
|-------|----------------|
| N, P, K | 20 |
| Ca, Mg, S | 30 |
| B, Fe, Mn, Zn, Cu, Mo, Co, Na, Cl, … | 50 |

Underdose: по умолчанию симметричный soft penalty; UI показывает дефицит %.

### 4.5 Solver

См. ADR-014. Требования:

- `x ≥ 0`, bounds, weighted least squares / QP;
- corridors overdose;
- NH₄ share limit;
- A/B incompatibility;
- deterministic;
- **runs in browser and React Native** (Hermes-safe: без Node-only APIs);
- время: < 2 s на типичном наборе ≤ 30 удобрений × 15 элементов на mid phone.

### 4.6 EC

Независимая реализация LMCv2-style (публичное описание, **не** копировать GPL HydroBuddy). UI: «оценка EC», disclaimer.

### 4.7 Сохранение и связи

`nutrient_recipes` farm-scoped; optional `cycle_id`, `plant_id`, `scope_id`, `event_id` после записи в журнал.  
Payload result хранит `solver_version` + snapshot inputs для воспроизводимости.

### 4.8 Provenance (MUST)

Каждый fertilizer / composition line / target profile / coefficient / feed schedule step хранит:

| Поле | Смысл |
|------|--------|
| `source_type` | `manufacturer_datasheet` \| `scientific_publication` \| `open_source_db` \| `legacy_import` \| `user_entered` |
| `citation` / `url` | ссылка на PDF/страницу/DOI |
| `license` | текст/SPDX-like |
| `retrieved_at` | timestamptz |
| `verified_by` | user id or `system:seed` |
| `verification_status` | `unverified` \| `spot_checked` \| `verified` \| `disputed` |
| `confidence` | `low` \| `medium` \| `high` |
| `notes` | known errors (Na₂O Hydroodo и т.п.) |

UI badge на карточке удобрения/профиля. User-custom — отдельный визуальный маркер.

### 4.9 i18n

Все строки UI калькулятора в catalogs; минимум PRODUCT_LOCALES; `check-i18n` зелёный.

### 4.10 Доступность данных

Global reference: read для любого authenticated member любой фермы.  
Write global: только migration/seed/service_role.  
Farm data: RLS membership.

---

## 5. Нефункциональные требования

- Determinism: одинаковый input → bit-stable output (до округления display 3–4 decimals).
- No GPL code in tree; attribution files for imported facts.
- Package side-effect free; tree-shakeable exports.
- Tests in CI-equivalent local `pnpm test` (нет GH Actions — всё равно обязателен зелёный vitest перед merge).
- Security: не класть service role в mobile; recipes через JWT+RLS.

---

## 6. Модель данных (детализация)

### 6.1 `nutrient_data_sources`

```
id uuid PK
slug text UNIQUE  -- e.g. hydroodo-0.4b18, hydrobuddy-salts, hoagland-1950, gh-flora-chart-2024
name text
source_type text NOT NULL
url text
license text
retrieved_at timestamptz
verification_status text
confidence text
notes text
metadata jsonb DEFAULT '{}'
created_at, updated_at
```

### 6.2 `fertilizer_products` (global) / `farm_fertilizer_products` (farm)

Общие поля: brand, name, physical_form (`solid`|`liquid`), label_basis (`w_w`|`w_v`), density_g_ml null, npk_label text null, is_active, source_id, verification_*, confidence, notes, external_key (idempotent import).

Farm table + `farm_id`, `created_by`.

### 6.3 `fertilizer_composition_lines`

product_ref (global or farm polymorphic: `product_kind` + `product_id`), `component_key` (e.g. `P2O5`, `NO3-N`), `value_pct`, `n_form` null|nitrate|ammonium|urea|amide, `is_chelated` bool, source_id.

Canonical elemental view — computed in TS from oxide factors, **not** only stored; optional materialized `elemental_pct jsonb` cache with `computed_with_factor_set_version`.

### 6.4 `target_solution_profiles`

name, locale_name jsonb optional, stage text, ppm jsonb (keys canonical), ec_target null, ph_target null, source_id, tags[], is_classic bool.

### 6.5 `feed_schedules` / steps

Manufacturer week-by-week ml/L charts; link products; provenance.

### 6.6 `farm_water_profiles`

farm_id, name, ppm jsonb, hco3_mg_l null, notes, source user.

### 6.7 `nutrient_recipes` / `nutrient_recipe_doses`

См. ADR-014. `result jsonb` включает achieved ppm, deviations, ec, warnings, match_score.

### 6.8 Indexes & RLS

- Unique `(source_id, external_key)` на products для idempotent seed.
- RLS templates per ADR-009; global SELECT policy `to authenticated using (true)`.

---

## 7. Импорт данных

### 7.1 Hydroodo (MUST, P2)

Источник на боксе: `/workspace/hydroodo/export/`:

| File | Content |
|------|---------|
| `components_declared.csv` | 127 fertilizers label % |
| `components_elemental.csv` | elemental recount |
| `systems_ppm.csv` | 21 targets |
| `elements.csv` | 38 forms/factors |
| `overdose.csv` | tolerances |
| `hydroodo_db.json` | combined |

Attribution: «Hydroodo 0.4 beta build 18 database (2012), legacy_import»; license note oos/unknown — **не** redistrib exe; numbers as facts + re-verify flag `unverified` initially; Na₂O note in oxide_factors.

### 7.2 HydroBuddy salts (P3)

https://github.com/danielfppps/hydrobuddy — GPL. Import **composition numbers only** after independent verification against labels/CRC handbooks where possible; record license of *upstream project*; **zero Pascal/Lazarus source**.

### 7.3 Classic recipes (P3)

Hoagland & Arnon, Long Ashton, Cornell lettuce, UFL HS796 tomato stages — scientific_publication citations (DOI/URL), high confidence after transcription check.

### 7.4 Hydromisc (P3/P4)

https://hydromisc.github.io — проверить license на сайте/репо перед seed; если запрет — не импортировать код/данные, только ссылка в Sources as external tool.

### 7.5 Ferti v2 (P4)

https://git.mlnp.fr/FAPG/ferti-v2 — CSV; respect license; attribution.

### 7.6 Manufacturers (P4+)

General Hydroponics / Terra Aquatica, Advanced Nutrients, Canna, Biobizz, Valagro, Буйские удобрения, …  
Для каждого продукта/chart: URL datasheet/PDF, retrieved_at, version/year. Feed schedules as `feed_schedules`.

### 7.7 Pipeline

```
scripts/nutrient-import/
  import-hydroodo.ts
  import-classics.ts
  import-manufacturer-stub.ts
supabase/seed/nutrient/*.json
```

Idempotent: upsert by `external_key` / slug. Re-run safe. Version bump `data_catalog_version` in sources metadata.

---

## 8. Golden tests и качество

### 8.1 Текущее состояние golden

`/workspace/hydroodo/golden/screens/` — скриншоты UI Hydroodo (case01–case14 из `batch.sh`). Машинночитаемых expected JSON пока может не быть.

**Требование:** завести `golden/cases/*.json` формата:

```json
{
  "id": "case04_olk_veg_salts",
  "target_system": "OLK - Вегетация",
  "fertilizer_external_keys": ["buyskie:calcium-nitrate", "..."],
  "volume_l": 1,
  "water": null,
  "min_match_pct": 0,
  "hydroodo_observed": {
    "match_pct": 88,
    "doses": [{"name": "Кальциевая селитра", "g_per_l": 0.709}, "..."],
    "ppm": {"N": 105.134, "P": 54.5, "K": 103.227, "Ca": 117.797, "Mg": 76.15, "S": 76.815},
    "source_screenshot": "golden/screens/case04_olk_veg_salts_B.png"
  }
}
```

Acceptance: для каждого case  
`weighted_error(ours) <= weighted_error(hydroodo_observed) + eps`  
и все элементы внутри overdose caps **или** не хуже Hydroodo по числу нарушений.

### 8.2 Прочие тесты

- Oxide factors exact vs molar masses.
- No double-count N when Total+forms present.
- Reverse(forward(x)) ≈ consistency within tol.
- Ion charge balance warning when |cations−anions| large.
- A/B rule fires on Ca + MgSO₄ same tank.
- Property: doses ≥ 0; empty fertilizer set → infeasible status.
- EC Hoagland order-of-magnitude.

---

## 9. UI (web + mobile)

### Web (Next.js)

- `/app` or `pages/nutrient-calculator` — calc workspace.
- `/sources` or settings subsection «Источники данных».
- Components: TargetEditor, FertilizerPicker, DoseTable, DeviationTable, EcBadge, SourceBadge, SaveRecipeDialog.
- Design: существующие Tailwind/shadcn токены grow-*.

### Mobile

- `(tabs)/more/nutrient-calculator` (+ stack for recipe detail).
- Reuse `@growlog/nutrient-calc`; data via domain queries.
- Large touch targets for dose readback in greenhouse.

### Trust UX

Source badge + link; disputed confidence → yellow warning before save.

---

## 10. API / use cases (domain)

В `packages/domain` (не в screens):

- `listFertilizerCatalog`, `listTargetProfiles`, `listDataSources`
- `upsertFarmFertilizer`, `upsertWaterProfile`
- `saveNutrientRecipe`, `listNutrientRecipes`, `getNutrientRecipe`
- `logFeedingFromRecipe` → `createLogEntry` event_type `feeding` + link recipe_id in payload

Calc itself: import from `@growlog/nutrient-calc` in UI (and optionally domain wrapper).

---

## 11. Фазы и критерии Done

### Phase 0 — Foundation docs & scaffold

**Done:** ADR-014 + это ТЗ приняты; `packages/nutrient-calc` skeleton; oxide/units/types; unit tests green; workspace dependency wired.

### Phase 1 — Solver parity

**Done:** forward+reverse+tolerances+weights; golden cases pass parity bar; chemistry sanity; no UI required beyond CLI/test harness.

### Phase 2 — Schema + Hydroodo seed + recipes CRUD API

**Done:** migration applied via `db:push`; RLS tests; 127+21 seeded with provenance; farm recipe save/load; SourceBadge component.

### Phase 3 — EC + A/B + classics

**Done:** EC tests; A/B split UI logic; classic profiles seeded.

### Phase 4 — Broader data + Sources page + web calc UI

**Done:** manufacturer stubs or first brands; Sources page; usable web calculator.

### Phase 5 — Mobile + journal link

**Done:** Expo screen; feeding event from recipe; i18n PRODUCT_LOCALES.

---

## 12. Вне скоупа (явно)

- Автодозирующие насосы / IoT dosing hardware control.
- Полный speciation / PHREEQC.
- Копирование GPL-кода HydroBuddy.
- Публикация чужих PDF datasheets в репозитории (только URL + extracted numbers).
- Замена lab EC meter.

---

## 13. Открытые вопросы

См. ADR-014 §Открытые вопросы + :

7. Нужен ли отдельный event_type `nutrient_mix_calculated` vs только `feeding`.
8. Хранить ли multiple solver alternatives (как список вариантов Hydroodo 88%×12) в P1 или один best.
9. Политика редактирования global catalog community contributions (позже).

---

## 14. Ссылки

- ADR-001…013 в `docs/adr/`
- `/workspace/hydroodo/REPORT.md`
- Science in Hydroponics LMCv2 articles (EC model description)
- HydroBuddy GitHub (compositions facts / GPL code boundary)
