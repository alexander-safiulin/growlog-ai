# Nutrient solver metrics

## Unsolicited element penalty

When a product supplies an element with **no positive target**, the forward objective adds a weighted squared **relative** term vs a typical background ppm (`UNSOLICITED_REFERENCE_PPM` in `objective.ts`), not a flat 0.05 mg/L floor. Values are documented in code and mirrored in `tests/fixtures/nutrient-golden/generate-reference-optima.py`.

## Normaliser

The objective is divided by the sum of priority weights of **targeted** groups only (`objectiveNormalizer`). Unsolicited elements add to the numerator but never to the denominator, so a stray Na/Cl can only raise the objective.

## Soft micro cap

By default (`microOverdoseCap: 'soft'`) micro overdose ceilings are not constraints. Above `target × (1 + overdose%)` the solver objective (`computeSolverObjective`) adds `100 × w_g × ((achieved − ceiling) / target)²`, and the solution carries `micro_over_cap:<groups>`. Macro ceilings stay hard. `computeObjective` (reported, used by golden reference) excludes this term; golden Hydroodo parity runs with `microOverdoseCap: 'hard'`.

## `weightedMacroDeviation`

Priority-weighted RMS of relative macro deviations (see `DEFAULT_ELEMENT_PRIORITY`). Used as `SolveSolution.weightedError` after forward solve.

## Hydroodo legacy matrix

With `options.model: 'hydroodo_legacy'`, total `N` and form keys (`NO3`, `NH4`, …) **stack** into the `N` row (FloraDuo-style), matching Hydroodo GUI and the scipy reference script.
