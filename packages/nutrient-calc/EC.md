# EC estimation (`@growlog/nutrient-calc`)

## Purpose

Provide a deterministic **estimate** of solution electrical conductivity (EC, mS/cm at 25 °C) from elemental ppm, for UI display and optional hard `maxEcMsCm` solver constraints. This is not a substitute for a calibrated EC meter.

## Model (LMCv2-style)

Independent of GPL HydroBuddy code. Based on the limiting molar conductivity (LMC) family described publicly on [Science in Hydroponics](https://scienceinhydroponics.com/) (LMCv2 constant `k = 0.7025187`).

1. **Speciation** — elemental target/achieved ppm → principal ions (mol/L):
   - `N_NO3` → NO₃⁻ (N reported as nitrate-N).
   - `N_NH4` → NH₄⁺.
   - `N` (legacy Hydroodo group) → NO₃⁻ equivalent when no form split is present.
   - `P` → H₂PO₄⁻ at working pH ~5.5–6.5 (monovalent assumption; optional HPO₄²⁻ flag).
   - `S` → SO₄²⁻.
   - K, Ca, Mg, Na, Cl, HCO₃⁻, and trace metals → corresponding ions (see `ec-lambda0.ts`).

2. **Ionic strength** — `I = ½ Σ cᵢ zᵢ²` (mol/L).

3. **Activity-corrected molar conductivity** — `Λᵢ = Λ°ᵢ exp(−k √I · |zᵢ|^1.5)`.

4. **EC** — `κ (S/cm) = Σ cᵢ Λᵢ`; reported as **mS/cm** (`κ × 1000`).

## Λ° data

Tabulated in `src/ec-lambda0.ts` with CRC Handbook / standard aqueous electrolyte references. Do not tune Λ° values to match a single recipe.

## Validation tolerance (tests)

| Reference | Expected band (mS/cm) | Source |
|-----------|----------------------|--------|
| Hoagland standard macro profile | 1.5 – 3.0 | Handbook ~2.4–2.5 mS/cm; band allows LMC activity correction + P speciation |
| Long Ashton nitrate type | 1.4 – 3.2 | Published hydroponic tables, same order of magnitude |

Golden Hydroodo cases do not export EC; forward ppm parity is tested separately.

## Disclaimer

Exported string: `EC_ESTIMATE_DISCLAIMER` in `ec-lmcv2.ts`.
