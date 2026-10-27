ADR-014: Nutrient Solution Calculator Module

Статус: Accepted (P0–P4 shipped; P5 in progress; guest mode + UI polish 2026-10-23)
Дата: 2026-10-21
Автор: A. Safiulin, OG Lab.
Связан с: ADR-001, ADR-002, ADR-005, ADR-009, ADR-011, ADR-012, ADR-013
Спека: `docs/implementation/TZ-nutrient-calculator.md`

⸻

Контекст

Гроверы в hydro/soilless регулярно подбирают дозы удобрений под целевой ppm-профиль, воду источника, объём бака и (часто) схему A/B. В экосистеме есть legacy-инструменты:

- **Hydroodo 0.4b18** (Delphi, 2012) — перебор/подбор с допусками overdose; данные 127 удобрений / 21 систем; без EC; баги коэффициентов (Na₂O 0.56 вместо 0.742; риск двойного счёта N).
- **HydroBuddy** (GPL) — соли, EC через limiting molar conductivity / ionic strength (LMCv2); исходники нельзя копировать.
- Коммерческие feed charts (GH, AN, Canna, Biobizz, Valagro, Буйские и др.) и классические рецепты (Hoagland, Long Ashton, Cornell lettuce, UFL HS796).

Growlog уже имеет event spine (`events`, тип `feeding`/`watering`), farm-scoped `materials`/`material_lots` (ADR-013/GACP), `plants`/`grow_cycles`/`scopes`, knowledge grounding (`knowledge_sources`/`knowledge_items`), i18n (`en`/`ru`/`th`/`my` + web locales), monorepo `packages/domain` + `packages/api-client` + `apps/mobile` (Expo) + Next.js web, self-hosted Supabase (`pnpm db:push`).

Нужен **детерминированный клиентский калькулятор** как shared pure-TS пакет + справочные данные с **provenance first-class**, без зависимости от GPL-кода и без server-only solver.

⸻

Проблема

Без явного ADR:

1. solver размажется по UI web/mobile с разным поведением;
2. справочники удобрений попадут в БД без лицензий/источников → юридический и trust-риск;
3. `materials` (GACP inventory) смешается с global fertilizer catalog;
4. EC/oxide conversion будут «магией» без тестов против golden Hydroodo;
5. RLS либо откроет write на global data, либо запретит чтение справочников.

⸻

Основное решение

1. **Пакет `@growlog/nutrient-calc`** (`packages/nutrient-calc`) — pure TypeScript, без React/Expo/Next/Supabase. API: forward (target → doses), reverse (doses → solution), units, oxide factors, EC estimate, A/B tank rules, NH₄ share, weighted bounded NNLS/QP. Детерминизм: фиксированный алгоритм, стабильный порядок переменных, без RNG.

2. **Solver только client-side** (web + mobile). Сервер хранит справочники и сохранённые рецепты; не пересчитывает mix для UX. Опциональный server recompute — только для audit/report jobs с тем же пакетом.

3. **Двухслойная модель данных:**
   - **Global reference** (`farm_id IS NULL`): fertilizers, compositions, target profiles, classic recipes, overdose defaults, conversion coefficients, data sources — **SELECT для `anon` и `authenticated`** (гостевой калькулятор на web без логина); write только seed/admin/service.
   - **Farm-scoped**: water profiles, custom fertilizers, saved recipes/mixes, links to cycle/plant/event — RLS через `user_farm_ids()` (ADR-009).

4. **Provenance first-class.** Каждая сущность состава/рецепта/коэффициента ссылается на `nutrient_data_sources` (type, citation/URL, license, retrieved_at, verified_by, verification_status, confidence, notes). UI: badge + страница «Источники данных».

5. **Импорт данных как facts, не как код.** Hydroodo XML/CSV → seed с атрибуцией; HydroBuddy compositions — перепроверить числа, зафиксировать GPL на *исходнике*, не копировать Pascal; manufacturer PDF/chart — URL + дата + версия. Oxide→element: считать из молярных масс в коде пакета; Hydroodo factors хранить как legacy-import с пометкой known_error для Na₂O.

6. **Связь с доменом Growlog:** сохранённый mix → опционально `events` (`feeding`) + payload; опциональная связь `materials` (inventory lot) ≠ catalog fertilizer; `plant_id` / `cycle_id` / `scope_id` на recipe.

7. **Качество:** на golden cases из `/workspace/hydroodo/golden/` (и JSON fixtures рядом) weighted error ≤ Hydroodo при тех же допусках; property + chemistry sanity tests в vitest.

8. **Лицензии:** не включать GPL-код HydroBuddy в репозиторий. Числа составов — факты после verification. Hydroodo binary/DB не коммитить; seed JSON/CSV с attribution — да.

⸻

Алгоритм (нормативный контракт)

### Forward solve

Вход:

- target `b` — мг/л (ppm) по элементам: N-NO₃, N-NH₄ (опц. N-NH₂/urea), P, K, Ca, Mg, S, Fe, Mn, Zn, Cu, B, Mo; опц. Cl, Na, Si, Co;
- матрица `A` — вклад удобрения j в элемент i (мг/л на 1 г/л или 1 мл/л);
- source water `w` — вычитается: `b' = max(0, b − w)` (или keep signed deficit flag);
- volume V (л) — для масштабирования массы/объёма доз;
- bounds: `0 ≤ x_j ≤ x_j^max` (max solubility / stock concentration factor);
- tolerance corridors: relative overdose caps (Hydroodo defaults: NPK 20%, Ca/Mg/S 30%, micro 50%); soft underdose penalty;
- weights `W` по элементам (выше для NPK);
- constraints: NH₄ share of total N ≤ limit; A/B incompatibility (Ca vs SO₄/PO₄ в одном баке); optional integer-free continuous doses.

### Оптимизация (forward / inverse dose pick) — утверждённый дизайн

**Жёсткие ограничения** (нарушение → решение недопустимо):

- `x_j ≥ 0` (дозы неотрицательны);
- потолок **overdose** по макро (N/NO₃/NH₄/P/K/Ca/Mg/S): `A_g x ≤ T_g × (1 + overdose_pct_g)` (дефолты Hydroodo: NPK 20%, Ca/Mg/S 30%). Потолок **micro** (дефолт 50%) по умолчанию **мягкий** (см. ниже); `microOverdoseCap: 'hard'` делает его жёстким (golden Hydroodo parity);
- доля NH₄: `NH₄ / N_total ≤ η` (если задано);
- опционально: `EC ≤ EC_max` (когда доступна оценка EC);
- опционально: `x_j ≤ x_j^max` (max dose / solubility).

**Целевая функция** (минимизируем; веса и асимметрия — параметры `SolverObjectiveConfig`, дефолты в `@growlog/nutrient-calc`):

```
Для каждого элемента g с целью T_g > 0:
  rel_g = (A_g − T_g) / T_g
  penalty_g = w_g × asym_g(rel_g) × rel_g²
  w_g — приоритет (макро > микро, настраивается)
  asym_g — больше штраф за передоз (особенно micro), чем за недобор (настраиваемые macro/micro overdose/underdose factors)

Для T_g = 0, но A_g > 0:
  penalty_g = w_unsolicited × (A_g / ref_ppm)²   # ref_ppm маленький эталон, без деления на ноль

Мягкий потолок micro (только при A_g > C_g = T_g × (1 + overdose_pct_g)):
  penalty_g += 100 × w_g × ((A_g − C_g) / T_g)²   # +10% от цели сверх потолка ≈ полностью отсутствующий micro

objective = Σ penalty_g / Σ_{g: T_g > 0} w_g
```

Нормировка — только по элементам с целью: посторонний элемент (Na/Cl из соли) не может увеличить знаменатель и тем самым понизить objective.

Недобор относительно цели штрафуется **мягко** через целевую функцию; потолок overdose по макро — **жёстко**. Превышение мягкого потолка micro выдаёт warning `micro_over_cap:<элементы>`. Причина мягкого потолка: один micro в микромиксе (обычно Cu) упирается в потолок раньше остальных и жёстко ограничивает дозу всего микромикса. При мягком потолке солвер может немного перейти потолок ради остальных micro. Пример: golden `case08` даёт Cu 151% при потолке 150%, Fe 28% → 30%, Mo 20% → 40%. Сам потолок недобор Fe не убирает: если в микромиксе Cu/Fe сильно выше целевого соотношения, дозу микромикса держит асимметрия `microOverdoseFactor` в целевой функции, а не потолок.

**Тай-брейки / альтернативы:** см. «Magic wand / ранжирование» (P5). Дозы на сетке 0,001 г/мл/л; после округления ограничения проверяются повторно.

**Hydroodo forward (reverse check):** `mg/L = dose × declared% × factor(form→element) × 10` с `factor=0 → 1` (см. golden `hydroodo/`). Это **не** формула «Раствор: %» GUI.

**Солвер** (`solve-optimize.ts`, версия `nutrient-calc@0.3.0-qp`). Целевая функция кусочно-квадратичная, выпуклая и C¹, поэтому решается точно, без эвристик и без RNG:

1. Box `0 ≤ x ≤ x^max` (плюс связка A/B) — projected Newton (Bertsekas) с Armijo; fallback — projected gradient.
2. Линейные ограничения (жёсткие потолки, доля NH₄, EC) — augmented Lagrangian (PHR); EC линеаризуется итеративно (≤ 8 проходов).
3. Округление на сетку 0,001: полный перебор floor/ceil (≤ 10 продуктов), затем координатные и парные шаги. Ограничения проверяются на каждой точке сетки.

Один режим на web и mobile; «быстрого» режима нет. Время решения — единицы мс на golden cases. Objective совпадает с независимым эталоном scipy (`tests/fixtures/nutrient-golden/generate-reference-optima.py` → `reference-optima.json`) до 1e-5. Тот же objective/constraints для elemental и hydroodo chemistry mode.

**Не цель:** побитовое совпадение доз с Hydroodo (там другой оптимизатор, часто на потолке overdose). Паритет — по качеству (Growlog match / weighted macro deviation) при тех же caps (golden parity запускается с `microOverdoseCap: 'hard'`); forward — точный пересчёт mg/L по дозам.

Выход: doses (g/L или ml/L и total for V), achieved ppm, % deviation, in/out of tolerance flags, match score, EC estimate, ion balance, NH₄:NO₃, warnings.

### Reverse mode

`x` задан → `y = A x + w`; отклонения от optional target; EC; без оптимизации.

### Oxide → element

Канонические факторы из молярных масс (пакет):

| Form | Element | Factor |
|------|---------|--------|
| P₂O₅ | P | 2×30.974 / 141.945 ≈ 0.4364 |
| K₂O | K | 2×39.098 / 94.196 ≈ 0.8301 |
| CaO | Ca | 40.078 / 56.077 ≈ 0.7147 |
| MgO | Mg | 24.305 / 40.304 ≈ 0.6030 |
| SO₃ | S | 32.06 / 80.06 ≈ 0.4005 |
| SO₄ | S | 32.06 / 96.06 ≈ 0.3338 |
| Na₂O | Na | 2×22.990 / 61.979 ≈ **0.7416** (не 0.56 Hydroodo) |

Азот: формы NO₃-N / NH₄-N / urea-N — **не суммировать с Total N**, если оба заданы (Hydroodo bug). Правило: если есть forms — использовать forms; иначе Total N как NO₃-equivalent с warning.

### EC estimate (независимо от GPL)

Описать и реализовать **LMCv2-style** модель по опубликованным статьям Science in Hydroponics (не копируя код HydroBuddy):

1. Разложить раствор на ионы с зарядами (NO₃⁻, NH₄⁺, H₂PO₄⁻/HPO₄²⁻ упрощение, K⁺, Ca²⁺, Mg²⁺, SO₄²⁻, микро-ионы…).
2. `I = ½ Σ c_i z_i²` (моль/л).
3. `EC ≈ Σ c_i Λ°_i exp(−k √I · |z_i|^{1.5})` (мСм/см), где `Λ°_i` — tabulated limiting molar conductivities (seed с provenance), `k ≈ 0.7025` как в публичном описании LMCv2.
4. Документировать погрешность: оценка, не замена измерителя; unit test на Hoagland ≈ 2.0–2.7 mS/cm порядка величины.

Альтернатива (feature flag): линейная empirical EC = Σ c_element · f_e + const — только если опубликованы коэффициенты с citation.

### A/B tanks

- Concentration factor C (обычно 100×): stock dose = field_dose × C.
- Incompatibility: Ca-bearing fertilizers не в одном баке с сульфатами/фосфатами (hard rule + UI split suggestion).
- Output: Tank A / Tank B dose lists + dilution instructions.

### Units

ppm (мг/л), mmol/L, meq/L — конверсия через atomic mass и valence в пакете. UI хранит canonical ppm elemental.

⸻

Схема Supabase (эскиз)

Глобальные (read-only authenticated):

- `nutrient_data_sources`
- `nutrient_elements` (symbol, atomic_mass, valence, default_overdose_pct, group)
- `nutrient_oxide_factors` (form, element, factor, source_id, notes)
- `fertilizer_products` (brand, name, physical_form solid|liquid, density nullable, label_unit w/w|w/v, is_custom=false, source_id, confidence, …)
- `fertilizer_composition_lines` (product_id, form_or_element, value_pct, n_form enum, chelate…)
- `target_solution_profiles` (name, stage, ppm jsonb, source_id)
- `feed_schedules` + `feed_schedule_steps` (manufacturer charts)
- `nutrient_incompatibility_rules`

Farm-scoped:

- `farm_water_profiles` (farm_id, name, ppm jsonb, alkalinity_hco3…)
- `farm_fertilizer_products` (farm_id, … same shape, is_custom=true, source_type=user_entered)
- `nutrient_recipes` (farm_id, cycle_id?, plant_id?, scope_id?, target_profile_id?, volume_l, mode forward|reverse, inputs jsonb, result jsonb, solver_version, created_by)
- `nutrient_recipe_doses` (recipe_id, fertilizer_ref, dose_per_l, unit, tank a|b|single)

RLS:

- global tables: `SELECT` для `authenticated`; `INSERT/UPDATE/DELETE` deny (или service_role only).
- farm tables: `farm_id in (select user_farm_ids())`.

Миграция: `supabase/migrations/YYYYMMDDHHMMSS_adr014_nutrient_calculator.sql`, apply через `pnpm db:push`.

Seed: `supabase/seed/nutrient/` + script `scripts/seed-nutrient-data.ts` (idempotent upsert by natural key + source slug).

Связь с `materials`: optional `fertilizer_products.id` → `materials.metadata.catalog_product_id` для GACP lot tracking; не дублировать состав в materials.

⸻

Пакет и клиенты

```text
packages/nutrient-calc/
  package.json          # @growlog/nutrient-calc
  src/
    index.ts
    types.ts
    oxide.ts
    units.ts
    matrix.ts
    solve-forward.ts
    solve-reverse.ts
    ec-lmcv2.ts
    tanks-ab.ts
    tolerances.ts
    match-score.ts
  tests/                # or repo tests/unit/nutrient-calc-*
```

Web: страница калькулятора + «Источники данных» (Next.js pages/components).
Mobile: экран в More / capture adjacent (Expo Router), shared hooks через `@growlog/domain` queries + calc package.

i18n: ключи в `lib/i18n/messages/{en,ru,th,it,fr,es,de,vi,my,...}.ts`; `pnpm check-i18n`. PRODUCT_LOCALES (`en`, `ru`, `th`, `it`, `fr`, `es`, `de`, `vi`, `my`) приоритетны для UI калькулятора и мобильного клиента.

Тесты: root `vitest` `tests/unit/nutrient-*.test.ts` + golden fixtures `tests/unit/fixtures/nutrient-golden/*.json` (скопированы/нормализованы из `/workspace/hydroodo/golden/`).

⸻

Фазы

| Phase | Scope | Done when |
|-------|--------|-----------|
| P0 | ADR + ТЗ + schema draft + package scaffold + oxide/units + property tests | ADR merged conceptually; package builds; oxide Na₂O=0.742 covered |
| P1 | Solver forward+reverse + tolerances + Hydroodo golden parity | all golden cases ≤ Hydroodo weighted error; chemistry sanity green |
| P2 | Schema migration + RLS + seed Hydroodo 127/21 + provenance UI badge | `db:push` ok; authenticated read global; farm recipe CRUD |
| P3 | EC LMCv2 + A/B + NH₄ limits + classic recipes import | EC tests; A/B warnings; Hoagland etc. seeded |
| P4 | Manufacturer DBs + feed charts + Sources page + web UI | sources page lists counts/licenses; calculator usable on web |
| P5 | Hydroodo-style workspace (web + mobile) + magic wand + grow timeline | Tabbed UI; ranked alternatives; cycle-linked recipes & feeding events |

### P5 — Workspace UI (Hydroodo parity)

**Навигация mobile (горизонтальный скролл вкладок):**

| Вкладка | Содержание |
|---------|------------|
| Цели | Объём бака и один целевой профиль (мг/л) на этот бак |
| Удобрения | Global catalog + `farm_fertilizer_products`; редактор состава (w/w %, density); поиск, фильтр, избранное (★), multi-select |
| Растворы | Результат magic wand: все ранжированные варианты списком, каждый разворачивается отдельно (дозы на литр и на бак, элементы target / achieved / Δ%, переключатель «Цели» / «Замесы» и одна кнопка «Сохранить»). Ниже — farm-scoped **stock** / **working** рецепты (`nutrient_recipes.solution_kind`), RLS |
| Системы питания | `target_solution_profiles` + `feed_schedules` (каталог + пользовательские черновики в farm metadata) |
| Вода | `farm_water_profiles` (ppm + alkalinity) |
| Элементы | Справочник `nutrient_elements` / oxide factors; доля элемента в соли (напр. Na в Na-соли) |

Magic wand — поведение солвера внутри вкладки «Растворы», не отдельная закладка. Si/Cl/Na в таблице элементов по-прежнему скрыты, пока нет переключателя.

Web-калькулятор пока держит прежний набор: «Растворы» — сохранённые рецепты, «Magic wand» — солвер и панель результата. Выравнивание веба с мобильной навигацией — отдельным шагом.

**Magic wand / ранжирование альтернатив (нормативно):**

- Базовый forward solve — тот же точный солвер (`solve-optimize.ts`, `objective.ts`).
- Минимальная показываемая доза — 0,01 г/мл/л. Доза в (0; 0,01) не скрывается: для каждой такой дозы детерминированно выбирается лучшее из двух — поднять до 0,01 или исключить продукт и перерешать. A/B-пара решается как единое целое. Показанные ppm всегда равны `solveReverse` от показанных доз и воды.
- Лишний продукт остаётся в варианте, только если улучшает objective не меньше чем на 2,5·10⁻⁴; иначе берётся вариант без него. Это же правило действует для «следовых» строк (< 3% цели по макро): они убираются только если objective не ухудшается сверх порога (сначала все разом, затем по одной, от меньшей дозы).
- Эквивалентность ролей (`fertilizerRoleEquivalenceKey`) строится по макро-вектору. Если микро в продукте по массе не меньше, чем макро, продукт считается носителем микро (уникальный ключ): микромикс на Ca-хелатной основе не схлопывается с Ca-солью.
- Обязательные для покрытия группы — только макро (N, P, K, Ca, Mg, S), в обеих моделях химии. Цели по micro на отбор подмножеств не влияют.
- Альтернативы: детерминированный перебор исключений доминирующих и слабых доз (+ варианты A/B производителя).
- Ранжирование: округлённый показанный macro match % ↓ → меньше продуктов → ниже objective → ниже `productCostPerL`. Сравнение по округлённому % нужно, чтобы вариант с одним лишним продуктом не обходил более простой из-за разницы в десятые доли процента, которую пользователь не видит.
- Каждая альтернатива — отдельное подмножество активных `x_j > 0`; дубликаты по rounded doses отбрасываются (`solutionKey`).
- Параметр `maxAlternatives` (default 3, max 5). **Golden Hydroodo parity не регрессирует** — альтернативы не меняют `best` solve path.

**Результат:**

- Таблица macro + micro: target / achieved / Δ%; переключатели колонок; горизонтальный скролл; режим A/B stock.
- Ручная правка г/л или мл/л на мобильной вкладке «Растворы» не запускает оптимизатор. Строка помечается «Вручную». Граммы на бак, концентрат, EC и таблица элементов пересчитываются обратным ходом от изменённых доз (`solveReverse`).
- Stock для жидкостей: **mL/L** на концентрате (не g/L); соли — g/L solubility check (`tanks-ab.ts`).
- Warning `stock_solubility_unknown` в UI с **именем продукта**.

**Связь с grow timeline:**

- `nutrient_recipes.cycle_id` / `scope_id` на активный цикл; `linked_event_id` после `events` `feeding`.
- Повтор цикла: `parent_recipe_id` указывает на рецепт прошлого grow для «повторить систему с микроэлементами».

**Импорт Android «NPK Калькулятор»:**

- Парсер в `lib/nutrient/npk-android-import.ts`; provenance `source_type=user`, `user` import path; формат TBD — stub + unit test на fixture.

⸻

Последствия

**+** Единый детерминированный calc для web/mobile; trust через provenance; соответствие ADR-009/013.

**−** Объём seed/legal review; собственный 0-deps QP-солвер нужно поддерживать (страховка — сверка с scipy-эталоном в golden tests); EC всегда приближение.

**Риски:** лицензии manufacturer PDF; drift Hydroodo golden без машинночитаемых expected JSON (сейчас screenshots) — нужен OCR/ручной fixture export.

⸻

Открытые вопросы

1. ~~Точный pure-TS QP dependency (0-deps NNLS vs small MIT/Apache lib).~~ **Решено:** собственный 0-deps projected Newton + augmented Lagrangian в `solve-optimize.ts` (см. «Солвер»).
2. Нужен ли server-side recompute в report jobs в P1 или только P5.
3. Связь recipe → `materials`/`material_lots` обязательна ли для GACP farms.
4. Формат golden: JSON expected doses+ppm (предпочтительно) vs screenshot-only (текущее состояние `/workspace/hydroodo/golden/screens`).
5. **Si/Cl/Na в UI:** скрыты по умолчанию в таблицах результата/сравнения и в целях; переключатель «Показать Si, Cl, Na» (persisted в localStorage). Solver и предупреждения по Na/Cl из воды не меняются.
6. **Гостевой режим калькулятора (web + mobile shared TS):** глобальный каталог из Supabase или static bundle; пользовательские удобрения, вода, избранное, сохранённые растворы/системы — **localStorage (web) / AsyncStorage (mobile)** через `@growlog/domain` guest-store. Mobile: сохранение своих рецептов на устройстве без входа; экспорт **PDF только своих рецептов** (без каталога, без JSON/CSV). Облако — только после явной синхронизации (Google/email) и merge в farm. Локальный журнал (календарь, полив/кормление) — отдельный AsyncStorage до sync. Связь с `grow_cycles` / `events` — только после sync с authenticated farm.
7. **Баннер обновления (web):** poll `/api/app-build` + on focus; mobile — сравнение с `public/mobile-app-version.json` (без expo-updates).
8. **GACP / recipe → material_lot:** опциональная nullable связь рецепта с партией материала — **позже**, без UI по умолчанию (см. ADR-013).

⸻

Короткая формулировка

Добавляем client-side `@growlog/nutrient-calc` и ADR-014 схему справочников/рецептов с provenance и RLS (global read / farm write), импортируя Hydroodo и прочие источники как атрибутированные факты; качество не хуже Hydroodo на golden, EC по независимому LMCv2-описанию без копирования GPL.
