# Nutrient calculator reference seed (Hydroodo legacy import)

This directory holds **versioned reference data** imported from Hydroodo 0.4 beta build 18 (2012) for the nutrient calculator module (ADR-014). It is **not** applied to Postgres until P2 (`pnpm db:push` + import scripts).

## Provenance (`nutrient_data_sources` slug: `hydroodo-0.4b18`)

| Field | Value |
|-------|--------|
| `source_type` | `legacy_import` |
| `citation` | Hydroodo 0.4 beta build 18 database (`database.zip`, 2012-09-30), Google Code project `hydroodo` |
| `url` | https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/hydroodo/hydroodo18.rar |
| `license` | Third-party, attribution required; verify before redistribution (Google Code metadata: "oos") |
| `retrieved_at` | `2026-10-21T00:00:00Z` |
| `verification_status` | `unverified` |
| `confidence` | `medium` |

See also `SOURCES.md` in this folder for download hashes and analysis notes.

## Files

- `reference/hydroodo/hydroodo_db.json` — combined export (127 fertilizers, 21 target profiles, overdose defaults, elements)
- `reference/hydroodo/*.csv` — same data in tabular form (`components_declared.csv`, `components_elemental.csv`, `systems_ppm.csv`, `elements.csv`, `overdose.csv`)

**Do not commit** Hydroodo binaries (`hydroodo.exe`, `.rar`).

## Known data corrections (applied in `@growlog/nutrient-calc`, documented here)

1. **Na₂O → Na factor:** Hydroodo `elements.xml` uses **0.56**; correct molar-mass factor is **≈ 0.7416** (`2×22.990 / 61.979`). The solver and `components_elemental.csv` in this export use the corrected factor. Legacy 0.56 is retained only in raw `elements.csv` / `hydroodo_db.json` `elements` array for audit.

2. **Nitrogen double counting:** Three products declare both total **N** and N forms (NO₃/NH₄/NH₂). Elemental N must **not** sum total N with forms:
   - ASB GreenWorld — Spezialdunger Geranien (`N` + `NH2`)
   - BIOBIZZ — Bio-Bloom (`N` + `NH4`)
   - GHE France — FloraDuo BLOOM (`N` + `NO3` + `NH4`)

   Rule: if `N > 0`, use total N for elemental nitrogen and allocate NO₃/NH₄/urea from form fields without adding `N` again. Raw declared values remain in `components_declared.csv`.

## Golden / parity

Machine-readable Hydroodo solver outputs are not in this bundle. Golden tests live under `tests/fixtures/nutrient-golden/` with a slot for future Hydroodo screenshot transcriptions.
