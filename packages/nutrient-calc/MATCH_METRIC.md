# Nutrient solver metrics

## Unsolicited element penalty

When a product supplies an element with **no positive target**, it is free up to the top of its usual working range `ref` (`UNSOLICITED_REFERENCE_PPM` in `objective.ts`: B 0.5, Mn 1, Zn 0.5, Cu 0.1, Mo 0.05, Fe 2, Na/Cl 10, S 50, …). Above that the objective adds `w_unsolicited × ((achieved − ref) / ref)²` (`unsolicitedFreeFraction` scales the free threshold; 0 penalises from zero). Values are mirrored in `tests/fixtures/nutrient-golden/generate-reference-optima.py`.

## Normaliser

The objective is divided by the sum of priority weights of **targeted** groups only (`objectiveNormalizer`). Unsolicited elements add to the numerator but never to the denominator, so a stray Na/Cl can only raise the objective.

## Soft micro cap

By default (`microOverdoseCap: 'soft'`) micro overdose ceilings are not constraints. Above `target × (1 + overdose%)` the solver objective (`computeSolverObjective`) adds `microSoftCapPenalty × w_g × ((achieved − ceiling) / target)²` (default weight 1), and the solution carries `micro_over_cap:<groups>`. Macro ceilings stay hard. `computeObjective` (reported, used by golden reference) excludes this term; golden Hydroodo parity runs with `microOverdoseCap: 'hard'`.

## `weightedMacroDeviation`

Priority-weighted RMS of relative macro deviations (see `DEFAULT_ELEMENT_PRIORITY`). Used as `SolveSolution.weightedError` after forward solve.

## Hydroodo legacy matrix

With `options.model: 'hydroodo_legacy'`, total `N` and form keys (`NO3`, `NH4`, …) **stack** into the `N` row (FloraDuo-style), matching Hydroodo GUI and the scipy reference script.
