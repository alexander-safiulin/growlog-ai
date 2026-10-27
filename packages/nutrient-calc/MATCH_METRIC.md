# Nutrient solver metrics

## Unsolicited element penalty

When a product supplies an element with **no positive target**, it is free up to the top of its usual working range `ref` (`UNSOLICITED_REFERENCE_PPM` in `objective.ts`: B 0.5, Mn 1, Zn 0.5, Cu 0.1, Mo 0.05, Fe 2, Na/Cl 10, S 50, …). Above that the objective adds `w_unsolicited × ((achieved − ref) / ref)²` (`unsolicitedFreeFraction` scales the free threshold; 0 penalises from zero). Values are mirrored in `tests/fixtures/nutrient-golden/generate-reference-optima.py`.

## Normaliser

The objective is divided by the sum of priority weights of **targeted** groups only (`objectiveNormalizer`). Unsolicited elements add to the numerator but never to the denominator, so a stray Na/Cl can only raise the objective.

## Soft micro cap

By default (`microOverdoseCap: 'soft'`) micro overdose ceilings are not constraints. The soft ceiling is `max(target × (1 + overdose%), MICRO_TESTED_SAFE_PPM − background)` (`microSoftCeilingPpm`; background = source water plus fixed A+B doses). Above it the solver objective (`computeSolverObjective`) adds `microSoftCapPenalty × w_g × ((achieved − ceiling) / target)²` (default weight 1), and the solution carries `micro_over_cap:<groups>`. Macro ceilings stay hard. `computeObjective` (reported, used by golden reference) excludes this term; golden Hydroodo parity runs with `microOverdoseCap: 'hard'`.

## Micro harm ceiling

In every cap mode and for targeted and untargeted rows alike, Fe/Mn/Zn/Cu/B are hard-capped at `max(0, MICRO_HARM_PPM − background, target)` (`microHarmCeilingPpm`). The solution carries `micro_harm_cap:<groups>` when an element ends within 1% of that ceiling and the ceiling is the harm level, not the target. `MICRO_TESTED_SAFE_PPM` (Fe 8.04, Mn 1.98, Zn 0.4, Cu 0.38, B 0.98) and `MICRO_HARM_PPM` (Fe 16.08, Mn 3.96, Zn 0.8, Cu 0.76, B 1.96) are the 2× and 4× levels of the cannabis micro trials cited in `objective.ts`; Mo has no harm data and no harm ceiling. The scipy reference mirrors the harm ceiling.

## `weightedMacroDeviation`

Priority-weighted RMS of relative macro deviations (see `DEFAULT_ELEMENT_PRIORITY`). Used as `SolveSolution.weightedError` after forward solve.

## Hydroodo legacy matrix

With `options.model: 'hydroodo_legacy'`, total `N` and form keys (`NO3`, `NH4`, …) **stack** into the `N` row (FloraDuo-style), matching Hydroodo GUI and the scipy reference script.
