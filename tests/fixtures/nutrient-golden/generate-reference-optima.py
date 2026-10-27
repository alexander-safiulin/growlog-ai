#!/usr/bin/env python3
"""Regenerate reference-optima.json (requires scipy).

Independent of @growlog/nutrient-calc: only scipy SLSQP / trust-constr on random starts
(never TS warm-start seeds). Matrix, groups, and objective match the TypeScript package.
"""
import json
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

CASES_PATH = Path(__file__).resolve().parent / "hydroodo" / "cases.json"
OUT_PATH = Path(__file__).resolve().parent / "reference-optima.json"

LEGACY_FACTOR = {
    "P2O5": 0.436,
    "K2O": 0.83,
    "CaO": 0.715,
    "MgO": 0.603,
    "SO3": 0.4,
    "SO4": 0.33,
    "MgSO4": 0.2,
    "MgSO4*7H2O": 0.099,
    "K(NO3)": 0.39,
    "CaCO3": 0.4,
    "Ca(NO3)": 0.17,
    "Na2O": 0.56,
}
LEGACY_GROUP = {
    "NO3": "N",
    "NH2": "N",
    "NH4": "N",
    "P2O5": "P",
    "K2O": "K",
    "CaO": "Ca",
    "MgO": "Mg",
    "SO3": "S",
    "SO4": "S",
    "MgSO4": "Mg",
    "MgSO4*7H2O": "Mg",
    "K(NO3)": "K",
    "CaCO3": "Ca",
    "Ca(NO3)": "Ca",
    "Na2O": "Na",
}
GROUP_ORDER = [
    "N",
    "N_NO3",
    "N_NH4",
    "N_UREA",
    "N_UNKNOWN",
    "P",
    "K",
    "Ca",
    "Mg",
    "S",
    "B",
    "Fe",
    "Mn",
    "Zn",
    "Cu",
    "Mo",
    "Co",
    "Na",
    "Cl",
]
MACRO = {"N", "P", "K", "Ca", "Mg", "S", "N_NO3", "N_NH4", "N_UREA"}
PR = {"N": 3, "P": 3, "K": 3, "Ca": 2, "Mg": 2, "S": 2, "Na": 0.5, "Cl": 0.5}
REF = {
    "N": 80,
    "P": 40,
    "K": 150,
    "Ca": 80,
    "Mg": 30,
    "S": 50,
    "B": 0.3,
    "Fe": 2,
    "Mn": 0.5,
    "Zn": 0.3,
    "Cu": 0.05,
    "Mo": 0.05,
    "Co": 0.02,
    "default": 0.05,
}
UW = 0.75
N_RANDOM_STARTS = 64
MAX_DOSE = 4.0


def stable_sort_fertilizers(fs):
    def key(i_f):
        i, f = i_f
        fid = f"{f['brand']}|{f['name']}|{i}"
        return f"{f.get('brand', '')}\0{f['name']}\0{fid}"

    return [f for _, f in sorted(enumerate(fs), key=key)]


def legacy_group(form: str) -> str:
    return LEGACY_GROUP.get(form, form)


def legacy_lines(declared: dict) -> list[tuple[str, float]]:
    lines = []
    for form, pct in declared.items():
        if pct is None or pct == 0:
            continue
        g = legacy_group(form)
        factor = LEGACY_FACTOR.get(form, 1.0)
        lines.append((g, pct * factor * 10.0))
    return lines


def collect_groups(fertilizers, target: dict) -> list[str]:
    seen = set()
    for g, v in target.items():
        if (v or 0) > 0:
            seen.add(g)
    for f in fertilizers:
        for g, _ in legacy_lines(f.get("declared_pct") or {}):
            seen.add(g)
    ordered = [g for g in GROUP_ORDER if g in seen]
    rest = sorted(g for g in seen if g not in GROUP_ORDER)
    return ordered + rest


def build_matrix(fertilizers, groups: list[str]) -> np.ndarray:
    n = len(fertilizers)
    m = len(groups)
    A = np.zeros((m, n))
    for j, f in enumerate(fertilizers):
        for g, coeff in legacy_lines(f.get("declared_pct") or {}):
            i = groups.index(g)
            A[i, j] += coeff
    return A


def resolve_priority(g: str) -> float:
    if g in PR:
        return PR[g]
    return 3.0 if g in MACRO else 1.0


def is_macro(g: str) -> bool:
    return g in MACRO


def obj_package(groups: list[str], target: dict, achieved: np.ndarray) -> float:
    """Match computeObjective() in packages/nutrient-calc/src/objective.ts."""
    achieved_map = {g: achieved[i] for i, g in enumerate(groups)}
    all_g = set(groups) | {k for k, v in target.items() if v} | {
        g for g, v in achieved_map.items() if abs(v) > 1e-15
    }
    s = 0.0
    # Normaliser: targeted groups only (unsolicited elements must not grow the denominator).
    w = sum(resolve_priority(g) for g, t in target.items() if (t or 0) > 0) or 1.0
    for g in all_g:
        T = target.get(g, 0) or 0
        A = achieved_map.get(g, 0.0)
        if T > 0:
            rel = (A - T) / T
            pw = resolve_priority(g)
            asym = (1.25 if rel > 0 else 1.0) if is_macro(g) else (2.0 if rel > 0 else 1.0)
            s += pw * asym * rel * rel
        elif A > 1e-12:
            ref = REF.get(g, REF["default"])
            rel = A / ref
            s += UW * rel * rel
    return s / w


def caps(target: dict, achieved: np.ndarray, groups: list[str], od: dict) -> bool:
    for g, t in target.items():
        if t <= 0 or g not in groups:
            continue
        i = groups.index(g)
        cap = t * (1 + od.get(g, 50) / 100)
        if achieved[i] > cap + 1e-6:
            return False
    return True


def wmd(target: dict, achieved: np.ndarray, groups: list[str]) -> float:
    macros = [g for g in ("N", "P", "K", "Ca", "Mg", "S") if (target.get(g, 0) or 0) > 0]
    if not macros:
        return 0.0
    vals = []
    for g in macros:
        i = groups.index(g)
        vals.append(((achieved[i] - target[g]) / target[g]) ** 2)
    return float(np.sqrt(np.mean(vals)))


def polish_feasible(groups, A, target, od, doses, max_pass=6, window=16):
    step = 0.001
    best = [round(float(d), 3) for d in doses]
    ab = A @ np.array(best)
    best_obj = obj_package(groups, target, ab) if caps(target, ab, groups, od) else float("inf")

    for _ in range(max_pass):
        for j in range(len(best)):
            if 0 < best[j] <= 0.01:
                trial = best[:]
                trial[j] = 0.0
                at = A @ np.array(trial)
                if caps(target, at, groups, od):
                    ot = obj_package(groups, target, at)
                    if ot < best_obj:
                        best_obj, best, ab = ot, trial, at
            for d in range(-window, window + 1):
                if d == 0:
                    continue
                trial = best[:]
                trial[j] = round(max(0.0, min(MAX_DOSE, trial[j] + d * step)), 3)
                at = A @ np.array(trial)
                if not caps(target, at, groups, od):
                    continue
                ot = obj_package(groups, target, at)
                if ot < best_obj:
                    best_obj, best, ab = ot, trial, at
    return best, float(best_obj), ab


def optimize(case):
    fs = stable_sort_fertilizers(case["inputs"]["fertilizers"])
    groups = collect_groups(fs, case["inputs"]["target_mg_l"])
    A = build_matrix(fs, groups)
    T = case["inputs"]["target_mg_l"]
    od = case["inputs"]["overdose_pct"]
    n = A.shape[1]

    cons = [
        {
            "type": "ineq",
            "fun": lambda x, i=i, t=t, g=g: t * (1 + od.get(g, 50) / 100) - A[i] @ x,
        }
        for i, g in enumerate(groups)
        for t in [T.get(g, 0)]
        if t > 0
    ]

    def f_cont(x):
        return obj_package(groups, T, A @ x)

    best_x = None
    best_f = float("inf")
    # Independent random starts only (offset seed — never matches TS mulberry32 warm starts).
    for s in range(1, N_RANDOM_STARTS + 1):
        x0 = np.random.RandomState(10_000 + s).uniform(0, 2, n)
        for method in ("SLSQP",):
            r = minimize(
                f_cont,
                x0,
                bounds=[(0, MAX_DOSE)] * n,
                constraints=cons,
                method=method,
                options={"maxiter": 600, "ftol": 1e-14},
            )
            a = A @ r.x
            if caps(T, a, groups, od) and f_cont(r.x) < best_f:
                best_f = f_cont(r.x)
                best_x = r.x.copy()

    if best_x is None:
        r = minimize(
            lambda x: f_cont(x)
            + 1e3 * sum(max(0.0, -c["fun"](x)) ** 2 for c in cons),
            np.random.RandomState(99).uniform(0, 2, n),
            bounds=[(0, MAX_DOSE)] * n,
            method="L-BFGS-B",
        )
        best_x = r.x

    # trust-constr polish from best continuous point
    try:
        r2 = minimize(
            f_cont,
            best_x,
            bounds=[(0, MAX_DOSE)] * n,
            constraints=cons,
            method="trust-constr",
            options={"maxiter": 400, "gtol": 1e-12},
        )
        if caps(T, A @ r2.x, groups, od) and f_cont(r2.x) < best_f:
            best_x = r2.x
            best_f = f_cont(r2.x)
    except Exception:
        pass

    ob_cont = float(f_cont(best_x))
    doses, ob_grid, ab = polish_feasible(groups, A, T, od, best_x)
    return {
        "objective_continuous": ob_cont,
        "objective": float(ob_grid),
        "macro_wmd": wmd(T, ab, groups),
        "cap_feasible": caps(T, ab, groups, od),
        "doses": doses,
    }


def main():
    cases = json.loads(CASES_PATH.read_text())["cases"]
    out = {
        "generator": "tests/fixtures/nutrient-golden/generate-reference-optima.py",
        "method": f"scipy SLSQP+trust-constr, {N_RANDOM_STARTS} random starts (independent), package objective",
        "cases": {},
        "notes": {
            "case07_samosa_bloom68_an_sensi": "Independent scipy (64 random starts) package-objective continuous optimum ≈0.4222 on 0.001g grid",
            "case08_olk_veg_master181818": "Hydroodo GUI exceeds Cu cap (~0.052 vs 0.03); continuous feasible optimum ≈0.139, best feasible 0.001 grid ≈0.1415",
            "case12_olk_veg_salts_min50": "Hydroodo no_variants; our all-element match exceeds min_match_pct so no below_min_match_threshold warning",
            "case13_olk_bloom13_valagro": "Independent scipy reference (not TS solver output)",
            "case14_samosa_night_flora3": "Independent scipy reference (not TS solver output)",
        },
    }
    for c in cases:
        cid = c["id"]
        if c["outputs"]["status"] != "ok":
            out["cases"][cid] = {"status": c["outputs"]["status"], "objective": None}
            continue
        out["cases"][cid] = optimize(c)
    OUT_PATH.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
