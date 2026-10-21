# AGENT-TASKS: Nutrient Calculator (ADR-014)

Готовые промпты для отдельных Cursor cloud agents. Каждый task — изолированный scope, явные files, acceptance tests.  
**Не пушить в GitHub**, пока Alexander явно не попросит. Источник правды по продукту: `TZ-nutrient-calculator.md`, `adr-014-nutrient-calculator.md`.  
Контекст Hydroodo на боксе: `/workspace/hydroodo/` (REPORT, export, golden).  
Репо: `alexander-safiulin/growlog-ai` @ `main`. Следовать `AGENTS.md`, ADR-002/009/012/013, `.cursor/rules`.

Нумерация задач: `NC-Txx`. Зависимости указаны. Параллелить можно задачи без общих файлов миграций.

---

## NC-T01 — Scaffold `@growlog/nutrient-calc`

**Depends:** none  
**Phase:** P0

### Prompt

```
You are working in growlog-ai (pnpm monorepo). Create packages/nutrient-calc (@growlog/nutrient-calc) as a pure TypeScript package with no React/Next/Expo/Supabase imports.

Follow packages/domain style (package.json exports, tsconfig). Wire workspace dependency from root if needed for tests.

Implement:
- src/types.ts — ElementKey, TargetPpm, FertilizerSpec, SolveInput, SolveResult, Dose, Deviation, TankId
- src/oxide.ts — molar-mass-based oxide→element factors; MUST use Na2O→Na ≈ 0.7416 (document Hydroodo bug 0.56); nitrogen form rules (no double-count)
- src/units.ts — ppm ↔ mmol/L ↔ meq/L
- src/tolerances.ts — Hydroodo defaults NPK 20 / CaMgS 30 / micro 50
- src/index.ts — public API stubs for solveForward/solveReverse (can throw not_implemented until T02)

Add vitest tests under tests/unit/nutrient-oxide.test.ts and nutrient-units.test.ts (repo root vitest.config include tests/**/*.test.ts).

Do NOT create Supabase migrations yet. Do NOT push. Update pnpm-workspace if needed (already packages/*).

Acceptance:
- pnpm exec vitest run tests/unit/nutrient-oxide.test.ts tests/unit/nutrient-units.test.ts passes
- Na2O factor test asserts ~0.7416 not 0.56
- Package imports from a tiny node script without DOM
```

**Files:** `packages/nutrient-calc/**`, `tests/unit/nutrient-oxide.test.ts`, `tests/unit/nutrient-units.test.ts`, root `package.json` only if script alias needed.

---

## NC-T02 — Forward/reverse solver + matrix

**Depends:** NC-T01  
**Phase:** P1

### Prompt

```
Implement constrained weighted non-negative least squares / small QP for nutrient doses in @growlog/nutrient-calc.

Requirements from docs/implementation/TZ-nutrient-calculator.md and ADR-014:
- Build matrix A (element × fertilizer) from elemental % and dose unit (g/L or ml/L)
- b' = target − water (element-wise)
- Minimize weighted squared error; x >= 0; optional upper bounds
- Soft/hard overdose corridors from tolerances
- Optional NH4/N_total max share constraint
- solveReverse(doses) → achieved ppm
- Deterministic; no Math.random; stable fertilizer ordering
- Hermes/browser safe (no node:fs)

Prefer zero-deps projected NNLS or MIT/Apache pure-TS QP. Do NOT copy HydroBuddy/GPL code.

Tests:
- tests/unit/nutrient-solve-basic.test.ts — synthetic 2-fertilizer exact mix
- tests/unit/nutrient-n-forms.test.ts — no N double count
- Property: all doses >= 0; reverse(A,x) matches A*x

Acceptance: vitest green; solveForward returns deviations and match_score in [0,1] or percent consistently documented.
```

**Files:** `packages/nutrient-calc/src/matrix.ts`, `solve-forward.ts`, `solve-reverse.ts`, `match-score.ts`, tests above.

---

## NC-T03 — Golden fixtures + Hydroodo parity harness

**Depends:** NC-T02  
**Phase:** P1

### Prompt

```
Create golden test harness for Hydroodo parity.

Read /workspace/hydroodo/REPORT.md, export/hydroodo_db.json, export/*.csv, golden/screens/*, batch.sh.

1. Define JSON schema for cases under tests/unit/fixtures/nutrient-golden/ (and optionally copy/normalize into repo).
2. Manually or with careful transcription from screenshots case04_olk_veg_salts_* encode at least 3 cases including case04 (OLK veg + Buyskye salts) with hydroodo_observed doses/ppm from screenshot descriptions.
3. Test: our solver weighted error <= Hydroodo observed (+ small eps) AND not more overdose violations than Hydroodo.

Also add chemistry sanity: ion balance warning helper tests.

If screenshots are the only source, document transcription in fixture notes; leave TODOs for remaining cases from batch.sh list.

Do not commit Hydroodo exe/binaries. Do not push.
```

**Files:** `tests/unit/fixtures/nutrient-golden/**`, `tests/unit/nutrient-golden-parity.test.ts`, maybe `scripts/nutrient-import/transcribe-notes.md`.

---

## NC-T04 — EC LMCv2-style estimate

**Depends:** NC-T01  
**Phase:** P3 (can parallel after T01)

### Prompt

```
Implement packages/nutrient-calc/src/ec-lmcv2.ts independently (no GPL code).

Model (from published LMCv2 description on scienceinhydroponics.com — describe in code comments with URL, do not paste HydroBuddy sources):
- Convert elemental ppm to ionic molar concentrations with documented simplifying assumptions for P speciation
- I = 0.5 * sum(c z^2)
- EC_mS = sum(c_i * Lambda0_i * exp(-0.7025187 * sqrt(I) * |z_i|^1.5))
- Seed Lambda0 table in src/ec-lambda0.ts with provenance comments (CRC/literature)

Tests: Hoagland-like ppm produces EC in a documented plausible band (e.g. 1.5–3.5 mS/cm); zero ions → ~0; disclaimer string exported.

Wire into SolveResult.ec_estimate_ms_cm.
```

**Files:** `packages/nutrient-calc/src/ec-*.ts`, `tests/unit/nutrient-ec.test.ts`.

---

## NC-T05 — A/B tanks + incompatibility rules

**Depends:** NC-T02  
**Phase:** P3

### Prompt

```
Add tanks-ab.ts: assign fertilizers to tank A/B/single with concentration factor C.
Hard rule: Ca-providing products incompatible with sulfate- or phosphate-providing products in same concentrated tank.
Return warnings and suggested split. Unit tests for Ca(NO3)2 + MgSO4 conflict; Flora-style 3-part may be single-tank dilute (document).

Integrate optional constraint into solveForward when mode=ab.
```

**Files:** `packages/nutrient-calc/src/tanks-ab.ts`, `tests/unit/nutrient-tanks-ab.test.ts`.

---

## NC-T06 — Supabase migration + RLS

**Depends:** ADR-014 reviewed  
**Phase:** P2

### Prompt

```
Add supabase/migrations/<timestamp>_adr014_nutrient_calculator.sql implementing ADR-014 tables:

Global (authenticated SELECT, no client writes):
nutrient_data_sources, nutrient_elements, nutrient_oxide_factors, fertilizer_products, fertilizer_composition_lines, target_solution_profiles, feed_schedules, feed_schedule_steps, nutrient_incompatibility_rules

Farm-scoped (user_farm_ids RLS):
farm_water_profiles, farm_fertilizer_products, farm_fertilizer_composition_lines, nutrient_recipes, nutrient_recipe_doses

Follow existing migration style (gen_random_uuid, set_updated_at triggers, enable RLS, policies). Use farm_id in (select public.user_farm_ids()). Global: create policy ... for select to authenticated using (true).

Do NOT run db:push unless user asks (needs GROWLOG_DB_PASSWORD + confirm). Document apply step in PR description.

Add tests/integration stub or unit SQL policy notes if integration harness requires env — at minimum document test cases per ADR-009 checklist for new tables.

Update packages/domain types if database.ts is generated manually — add TypeScript types for new tables in packages/domain/src/types/.
```

**Files:** `supabase/migrations/*_adr014_*.sql`, `packages/domain/src/types/nutrient.ts` (new), export from index if needed.

---

## NC-T07 — Hydroodo seed import (idempotent)

**Depends:** NC-T06  
**Phase:** P2

### Prompt

```
Create scripts/nutrient-import/import-hydroodo.ts and supabase/seed/nutrient/hydroodo-*.json committed with attribution.

Input: /workspace/hydroodo/export/hydroodo_db.json (+ csv). Map 127 components + 21 systems + overdose + elements.

Create nutrient_data_sources row slug=hydroodo-0.4b18 with notes on Na2O bug and license uncertainty; verification_status=unverified; confidence=medium for compositions.

Idempotent upsert by external_key = brand+name normalized. Store declared % lines; compute elemental via @growlog/nutrient-calc oxide module.

Do not commit exe/rar. Include SOURCES attribution text from /workspace/hydroodo/SOURCES.md adapted into seed README.

Acceptance: dry-run script prints counts 127/21; second run no duplicates.
```

**Files:** `scripts/nutrient-import/**`, `supabase/seed/nutrient/**`, `supabase/seed/nutrient/README.md`.

---

## NC-T08 — Domain queries/mutations for catalog + recipes

**Depends:** NC-T06  
**Phase:** P2

### Prompt

```
In packages/domain add nutrient catalog queries and recipe mutations taking SupabaseClient (same pattern as growlog/queries.ts, mutations.ts).

Functions: listGlobalFertilizers, searchFertilizers, listTargetProfiles, listDataSources, listFarmWaterProfiles, upsertFarmWaterProfile, upsertFarmFertilizer, saveNutrientRecipe, listNutrientRecipes, getNutrientRecipe, linkRecipeToFeedingEvent (creates events row event_type feeding with payload.recipe_id — validate farm_id).

Export paths in package.json like other growlog modules.

Unit tests with mocked supabase where feasible (tests/unit/nutrient-domain-*.test.ts).
```

**Files:** `packages/domain/src/growlog/nutrient-*.ts`, `packages/domain/package.json` exports, tests.

---

## NC-T09 — Classic recipes + oxide_factors seed

**Depends:** NC-T06, NC-T01  
**Phase:** P3

### Prompt

```
Seed target_solution_profiles for: Hoagland (standard), Long Ashton, Cornell lettuce, UFL HS796 tomato stage profiles — with scientific_publication citations (URL/DOI), retrieved_at=2026-10-21, verification_status=spot_checked, confidence=high after checking numbers against a cited public table (document URLs in seed notes).

Seed nutrient_oxide_factors from @growlog/nutrient-calc canonical set with source scientific; add legacy Hydroodo factor row for Na2O 0.56 marked disputed/known_error for documentation only (not used by solver).
```

**Files:** `supabase/seed/nutrient/classics.json`, import script, tests asserting profile count ≥ 4.

---

## NC-T10 — Web calculator UI + SourceBadge

**Depends:** NC-T02, NC-T08  
**Phase:** P4

### Prompt

```
Build Next.js web UI for nutrient calculator following existing pages/components patterns (Tailwind, I18nProvider, FarmProvider).

Screens:
- Calculator page: target editor, fertilizer multi-select, water select, volume, solve button, deviation table, EC badge, save dialog
- Sources page («Источники данных»): list nutrient_data_sources with counts, licenses, last update

Add SourceBadge component used on fertilizer rows.
Add i18n keys to lib/i18n/messages for en+ru at minimum; run pnpm check-i18n (fix th/my stubs if required by checker).

Client-side import @growlog/nutrient-calc for solve. Load catalog via domain queries.

Do not weaken RLS. Do not push.
```

**Files:** `pages/nutrient-*.tsx` or app router equiv used by repo, `components/nutrient/**`, `lib/i18n/messages/*.ts`.

---

## NC-T11 — Mobile calculator screen

**Depends:** NC-T02, NC-T08, NC-T10 (i18n keys)  
**Phase:** P5

### Prompt

```
Add Expo Router screen under apps/mobile for nutrient calculator (More stack). Follow apps/mobile/AGENTS.md and ADR-011.

Use @growlog/nutrient-calc + domain hooks/api-client patterns. Show doses prominently; save recipe; optional log feeding.

Reuse mobile-strings / i18n approach used by app. Keep screens thin.

Acceptance: TypeScript builds; smoke test or RTL test for dose table render with mock result.
```

**Files:** `apps/mobile/app/(tabs)/more/nutrient*.tsx`, `apps/mobile/components/nutrient/**`.

---

## NC-T12 — Manufacturer feed-chart import pipeline (stub + first brand)

**Depends:** NC-T07  
**Phase:** P4

### Prompt

```
Design idempotent importer for manufacturer products + feed schedules with mandatory provenance fields (url, retrieved_at, version, license note).

Implement one brand end-to-end as template (prefer Terra Aquatica / GHE Flora schedule already partially in Hydroodo systems) OR Буйские from Hydroodo with manufacturer_datasheet links where available.

Add Sources page counters. Document how to add GH, AN, Canna, Biobizz, Valagro later as separate agent tasks (NC-T12b…).

Legal: do not commit PDF binaries; store URL + extracted numeric schedule only.
```

**Files:** `scripts/nutrient-import/import-manufacturer-*.ts`, seed JSON, README section.

---

## NC-T13 — HydroBuddy compositions import (facts only)

**Depends:** NC-T06, legal note in ADR-014  
**Phase:** P3

### Prompt

```
Import salt composition facts from HydroBuddy project WITHOUT copying any GPL source files into the repo.

Procedure: fetch public composition tables / CSV if available; re-verify subset against labels; store with source_type=open_source_db, license note "upstream GPL - facts verified independently", url=github.com/danielfppps/hydrobuddy.

Deduplicate against Hydroodo products by normalized chemical name where obvious (Ca(NO3)2 etc.) — prefer verified manufacturer/scientific over duplicate legacy.

Write LICENSE-DATA.md section under supabase/seed/nutrient/.
```

**Files:** seed + import script + `supabase/seed/nutrient/LICENSE-DATA.md`.

---

## NC-T14 — Hydromisc / Ferti-v2 license gate + conditional import

**Depends:** NC-T06  
**Phase:** P4

### Prompt

```
Check licenses for https://hydromisc.github.io and https://git.mlnp.fr/FAPG/ferti-v2.

If license permits data reuse with attribution: import via scripts with provenance.
If not: do NOT import; add nutrient_data_sources rows as external_reference only (url, notes=not_imported_license), and document on Sources page as "linked tool".

Record decision in supabase/seed/nutrient/LICENSE-DATA.md.
```

---

## NC-T15 — Docs merge into growlog-ai docs/

**Depends:** T01–T06 conceptually ready  
**Phase:** P0/P2

### Prompt

```
Copy/adapt these box files into the repo (when Alexander approves):
- docs/adr/adr-014-nutrient-calculator.md  (from /workspace/hydroodo/spec/adr-014-nutrient-calculator.md)
- docs/implementation/TZ-nutrient-calculator.md
- Optionally docs/implementation/nutrient-calculator-agent-tasks.md from AGENT-TASKS.md

Update AGENTS.md with one bullet pointing to ADR-014 for nutrient calc.
Do not push unless asked. Ensure ADR numbering is 014 (013 is cultivation).
```

---

## Parallelism map

```text
T01 ─┬─ T02 ─ T03
     ├─ T04
     └─ T05 (after T02)
T06 ─┬─ T07 ─ T12 / T13 / T14
     └─ T08 ─ T10 ─ T11
T09 (after T06+T01)
T15 anytime after docs stable
```

---

## Definition of Done (module)

1. ADR-014 + TZ in `docs/`.
2. `@growlog/nutrient-calc` deterministic, unit-tested, golden parity ≥ Hydroodo on available fixtures.
3. Migration + RLS + Hydroodo seed + provenance.
4. Web UI calculator + Sources page.
5. Mobile screen + feeding event link.
6. LICENSE-DATA.md complete; no GPL code; no Hydroodo binaries in git.
