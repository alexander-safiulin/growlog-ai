# EC estimation (`@growlog/nutrient-calc`)

## Purpose

Deterministic **estimate** of solution EC (mS/cm at 25 °C) for UI and optional `maxEcMsCm` solver constraints.

## Model (LMCv2-style mixtures)

1. Elemental ppm → ion mol/L (`ec-lmcv2.ts`, documented speciation).
2. `I = ½ Σ cᵢ zᵢ²`.
3. `Λᵢ = Λ°ᵢ exp(−k √I · |zᵢ|^1.5)`, `k = 0.7025187` ([Science in Hydroponics](https://scienceinhydroponics.com/2020/04/nutrient-solution-conductivity-estimates-in-hydrobuddy.html)).
4. `κ (mS/cm) = Σ cᵢ Λᵢ` with **per-mole** Λ° from CRC (`ec-lambda0.ts`).

**2:2 sulfate pairing:** optional `ionPairing: true` applies association constants (Smith & Martell; Connick & Reasenberg) with Davies activity correction for Mg/Ca/Zn/Cu with SO₄. When pairing materially changes κ or disagrees with published single-salt measurements, the API returns `ecMsCmRange` and warning `ec_sulfate_ion_pairing_uncertain` instead of implying a false precision.

## Single-salt / CRC 0.01 N

`ec-electrolyte.ts` holds **published** equivalent conductance at 0.01 N, 25 °C ([Colostate CRC PDF](https://diverdi.colostate.edu/all_courses/CRC%20reference%20data/equivalent%20conductivity%20of%20electrolytes.pdf)). Unit tests compare **`estimateEcMsCm`** on single-salt ppm at the matching molarity — not a separate fitted curve.

**ZnSO₄ / CuSO₄ @ 0.01 M:** LMC + pairing does not match CRC κ (0.849 / 0.831 mS/cm) within ~25%; tests accept either ≤25% error or a published-bracketing `ecMsCmRange` plus `ec_sulfate_ion_pairing_uncertain`.

**Hoagland No.1 (~2.5 mS/cm measured):** default LMC (no pairing) is ~13% low (~2.17 mS/cm). Enabling `ionPairing: true` on the full profile lowers κ further (~2.12 mS/cm) because sulfate pairing removes free ions without fully reproducing 2:2 electrolyte conductance.

## Validation (tests)

| Check | Tolerance | Reference |
|-------|-----------|-----------|
| KCl, NaCl, KNO₃, ½CaCl₂, ½MgCl₂, ½Na₂SO₄ @ 0.01 N | ≤5% | CRC equivalent conductance table |
| Hoagland No.1 profile / salt forward | ±15% | ~2.5 mS/cm measured (Science in Hydroponics) |
| ZnSO₄, CuSO₄ @ 0.01 M + pairing | ≤25% or range + warning | CRC κ 0.849 / 0.831 mS/cm |
| ZnSO₄ + trace K | Δκ &lt;2% | Continuity (no pure-salt shortcut) |

## Disclaimer

`EC_ESTIMATE_DISCLAIMER` in `ec-lmcv2.ts`.
