# Nutrient solver metrics

## Unsolicited element penalty

When a product supplies an element with **no positive target**, the forward objective adds a weighted squared **relative** term vs a typical background ppm (`UNSOLICITED_REFERENCE_PPM` in `objective.ts`), not a flat 0.05 mg/L floor. Values are documented in code and mirrored in `tests/fixtures/nutrient-golden/generate-reference-optima.py`.

## `weightedMacroDeviation`

Priority-weighted RMS of relative macro deviations (see `DEFAULT_ELEMENT_PRIORITY`). Used as `SolveSolution.weightedError` after forward solve.

## Hydroodo legacy matrix

With `options.model: 'hydroodo_legacy'`, total `N` and form keys (`NO3`, `NH4`, …) **stack** into the `N` row (FloraDuo-style), matching Hydroodo GUI and the scipy reference script.
