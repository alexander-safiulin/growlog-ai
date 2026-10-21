# Growlog nutrient calculator match metric

Hydroodo shows **«Раствор: xx,xx%»** in the GUI. That aggregate formula is **not** reverse-engineered and is **not** used as a test oracle.

The **forward optimizer** uses a separate **weighted relative-deviation objective** (see ADR-014 and `DEFAULT_SOLVER_OBJECTIVE` in `@growlog/nutrient-calc`). Display match % below is for reporting and golden parity only.

## Growlog `growlog_match_pct`

For each targeted element `g` with target `T > 0`:

```
deviation_pct(g) = 100 × (A_g − T) / T
element_score(g) = max(0, 100 − |deviation_pct(g)|)
```

- **`growlog_match_pct_macros`**: mean of `element_score` over `{N,P,K,Ca,Mg,S}` with `T > 0`.
- **`growlog_match_pct_all`**: mean over all targeted elements.

`SolveSolution.matchScore` stores `growlog_match_pct_macros / 100` when using Hydroodo chemistry mode.

## Weighted macro deviation

```
weighted_macro_deviation = sqrt(mean(((A_g − T) / T)²))   for g ∈ {N,P,K,Ca,Mg,S}, T > 0
```

Used for inverse-mode parity vs Hydroodo golden cases (lower is better).

## Overdose caps (Hydroodo defaults)

Upper bound: `A_g ≤ T × (1 + overdose_pct[g]/100)` with NPK 20%, Ca/Mg/S 30%, micro 50% unless overridden.

Inverse parity requires our solution to respect the same caps and achieve **≤** Hydroodo weighted macro deviation (or **≥** Hydroodo macro match % under this metric).
