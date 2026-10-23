# Manufacturer nutrient catalog extracts (ADR-014 P5)

JSON files here are **raw transcribed facts** from manufacturer labels, SDS/TDS PDFs, and official feed charts. Each `extracted.json` includes:

- `retrieved_at` — ISO date when values were transcribed
- `source` — citation URL, license note, and stable `slug` for `nutrient_data_sources`
- `products` — guaranteed analysis (`ga_pct` keys match `buildGaImport` in `scripts/nutrient-import/p4-manufacturer-import.ts`)
- `feed_schedules` / `target_profiles` — optional official dosing tables and EC/pH targets (no invented ppm)

Binary snapshots (PDF/HTML) remain under `supabase/seed/nutrient/manufacturers-official/`; JSON here references them via `snapshot` paths when present.

Generated global seed SQL: `pnpm nutrient:build-p5-migration` → `supabase/migrations/*_adr014_p5_manufacturer_catalog.sql` (do not apply to production DB from agents; ship via migration only).
