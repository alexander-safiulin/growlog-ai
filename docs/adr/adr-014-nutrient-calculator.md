ADR-014: Nutrient Solution Calculator Module

Статус: Proposed
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
   - **Global reference** (`farm_id IS NULL`): fertilizers, compositions, target profiles, classic recipes, overdose defaults, conversion coefficients, data sources — read-only для `authenticated`, write только seed/admin/service.
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
- потолок **overdose** по элементу: `A_g x ≤ T_g × (1 + overdose_pct_g)` (дефолты Hydroodo: NPK 20%, Ca/Mg/S 30%, micro 50%);
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
```

Недобор относительно цели штрафуется **мягко** через целевую функцию; потолок overdose — **жёстко**.

**Тай-брейки / альтернативы** (при близком objective): меньше продуктов в смеси → проще дозы (сетка 0,001 г/мл/л, после округления повторная проверка ограничений) → ниже опциональная стоимость `productCostPerL`.

**Hydroodo forward (reverse check):** `mg/L = dose × declared% × factor(form→element) × 10` с `factor=0 → 1` (см. golden `hydroodo/`). Это **не** формула «Раствор: %» GUI.

**Солвер P1:** детерминированный coordinate search на сетке 0,001 с локальным pairwise refinement; тот же objective/constraints для elemental и hydroodo chemistry mode.

**Не цель:** побитовое совпадение доз с Hydroodo (там другой оптимизатор, часто на потолке overdose). Паритет — по качеству (Growlog match / weighted macro deviation) при тех же caps; forward — точный пересчёт mg/L по дозам.

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

i18n: ключи в `lib/i18n/messages/{en,ru,th,my,...}.ts`; `pnpm check-i18n`. PRODUCT_LOCALES приоритетны.

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
| P5 | Mobile UI + event linking + materials link | Expo screen; save recipe → optional feeding event |

⸻

Последствия

**+** Единый детерминированный calc для web/mobile; trust через provenance; соответствие ADR-009/013.

**−** Объём seed/legal review; QP в браузере/на телефоне требует лёгкого solver; EC всегда приближение.

**Риски:** лицензии manufacturer PDF; drift Hydroodo golden без машинночитаемых expected JSON (сейчас screenshots) — нужен OCR/ручной fixture export.

⸻

Открытые вопросы

1. Точный pure-TS QP dependency (0-deps NNLS vs small MIT/Apache lib).
2. Нужен ли server-side recompute в report jobs в P1 или только P5.
3. Связь recipe → `materials`/`material_lots` обязательна ли для GACP farms.
4. Формат golden: JSON expected doses+ppm (предпочтительно) vs screenshot-only (текущее состояние `/workspace/hydroodo/golden/screens`).
5. Si/Cl/Na: всегда в target UI или advanced toggle.
6. Публичный read global fertilizers для anon landing — нет (только authenticated), или да для marketing demo?

⸻

Короткая формулировка

Добавляем client-side `@growlog/nutrient-calc` и ADR-014 схему справочников/рецептов с provenance и RLS (global read / farm write), импортируя Hydroodo и прочие источники как атрибутированные факты; качество не хуже Hydroodo на golden, EC по независимому LMCv2-описанию без копирования GPL.
