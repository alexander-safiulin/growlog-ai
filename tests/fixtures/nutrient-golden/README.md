# Nutrient calculator golden fixtures

JSON cases used by `tests/unit/nutrient-golden-parity.test.ts` to regression-test `@growlog/nutrient-calc`.

## Schema (`case.json`)

```json
{
  "id": "string",
  "description": "human-readable",
  "target": { "N_NO3": 105.5, "P": 52.8, "...": 0 },
  "water": { },
  "fertilizers": [
    { "brand": "Буйские Удобрения", "name": "Кальциевая селитра" }
  ],
  "expect": {
    "reference_method": "bounded_nnls_v1_independent",
    "match_score_min": 0.85,
    "max_weighted_error": 0.2,
    "doses_min": 1
  },
  "hydroodo_observed": {
    "status": "pending",
    "notes": "Slot for doses/ppm transcribed from Hydroodo UI screenshots"
  }
}
```

## Reference method

`expect.reference_method` documents how expected thresholds were chosen:

- **`bounded_nnls_v1_independent`**: same pure-TS projected-gradient bounded NNLS as production, re-run at fixture authoring time with fixed fertilizer set and Hydroodo tolerances. Thresholds (`match_score_min`, `max_weighted_error`) encode feasible fit quality, not Hydroodo UI parity (yet).

## Hydroodo parity slot

When machine-readable or screenshot-derived Hydroodo outputs are available, fill `hydroodo_observed` with:

- `doses`: `{ "brand|name": g_per_L }`
- `achieved_ppm`: elemental map
- `match_score` / `weighted_error` if shown in UI

Tests should then assert our solver is **≤** Hydroodo weighted error where observed data exists.

## Hydroodo GUI oracle (`hydroodo/`)

Real Hydroodo 0.4b18 outputs (`source: hydroodo_gui`): `hydroodo/cases.json` (14 cases), `hydroodo/README.md`, `hydroodo/build.py`.

Forward tests assert `solveReverseHydroodo` matches `computed_from_doses` for every OK case. Inverse parity compares **Growlog match metric** (see `packages/nutrient-calc/MATCH_METRIC.md`), not Hydroodo «Раствор %».
