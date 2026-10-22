# EC estimation (`@growlog/nutrient-calc`)

## Purpose

Deterministic **estimate** of solution EC (mS/cm at 25 °C) for UI and optional `maxEcMsCm` solver constraints.

## Model (LMCv2-style mixtures)

1. Elemental ppm → ion mol/L (`ec-lmcv2.ts`, documented speciation).
2. `I = ½ Σ cᵢ zᵢ²`.
3. `Λᵢ = Λ°ᵢ exp(−k √I · |zᵢ|^1.5)`, `k = 0.7025187` ([Science in Hydroponics](https://scienceinhydroponics.com/2020/04/nutrient-solution-conductivity-estimates-in-hydrobuddy.html)).
4. `κ (mS/cm) = Σ cᵢ Λᵢ` with **per-mole** Λ° from CRC (`ec-lambda0.ts`).

**2:2 sulfate pairing:** optional `ionPairing: true` applies association constants (Smith & Martell) for Mg/Ca/Zn/Cu with SO₄; default **off** for mixed nutrient solutions.

## Single-salt / CRC 0.01 N

`ec-electrolyte.ts` holds **published** equivalent conductance at 0.01 N, 25 °C ([Colostate CRC PDF](https://diverdi.colostate.edu/all_courses/CRC%20reference%20data/equivalent%20conductivity%20of%20electrolytes.pdf)). Unit tests compare **`estimateEcMsCm`** on single-salt ppm at the matching molarity — not a separate fitted curve.

Pure ZnSO₄ / CuSO₄ @ 0.01 M: scale LMC ideal κ by `Λ_eq / (Λ°_cation + Λ°_SO₄)` using only CRC tabulated numbers. Mixed solutions: optional `ionPairing: true` (log₁₀ K ~2.25–2.35 + Davies); may emit `ec_sulfate_ion_pairing_uncertain`.

## Validation (tests)

| Check | Tolerance | Reference |
|-------|-----------|-----------|
| KCl, NaCl, KNO₃, ½CaCl₂, ½MgCl₂, ½Na₂SO₄ @ 0.01 N | ≤5% | CRC equivalent conductance table |
| Hoagland No.1 profile / salt forward | ±15% | ~2.5 mS/cm measured (Science in Hydroponics) |
| ZnSO₄, CuSO₄ @ 0.01 M | ≤15% | CRC Λ_eq 84.87 / 83.08 |

## Disclaimer

`EC_ESTIMATE_DISCLAIMER` in `ec-lmcv2.ts`.
