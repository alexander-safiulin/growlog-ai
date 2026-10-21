#!/usr/bin/env python3
"""Regenerate reference-optima.json (requires scipy). Port of owner reference opt.py."""
import json
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

ROOT = Path(__file__).resolve().parents[3]
CASES_PATH = Path(__file__).resolve().parent / "hydroodo" / "cases.json"
OUT_PATH = Path(__file__).resolve().parent / "reference-optima.json"

F = {
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
G = {
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
MAC = ["N", "P", "K", "Ca", "Mg", "S"]
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


def stable_sort_fertilizers(fs):
    """Match packages/nutrient-calc stableSortFertilizers (brand, name, id)."""

    def key(i_f):
        i, f = i_f
        fid = f"{f['brand']}|{f['name']}|{i}"
        return f"{f.get('brand', '')}\0{f['name']}\0{fid}"

    indexed = list(enumerate(fs))
    indexed.sort(key=key)
    return [f for _, f in indexed]


def mat(case):
    fs = stable_sort_fertilizers(case["inputs"]["fertilizers"])
    gs = set()
    for f in fs:
        for k in f["declared_pct"]:
            gs.add(G.get(k, k))
    gs = sorted(gs | {k for k, v in case["inputs"]["target_mg_l"].items() if v > 0})
    A = np.zeros((len(gs), len(fs)))
    for j, f in enumerate(fs):
        for k, p in f["declared_pct"].items():
            A[gs.index(G.get(k, k)), j] += p * F.get(k, 1) * 10
    return gs, A


def obj(gs, T, a):
    s = w = 0
    for g, v in zip(gs, a):
        t = T.get(g, 0)
        if t > 0:
            r = (v - t) / t
            m = g in MAC
            asy = (1.25 if r > 0 else 1) if m else (2 if r > 0 else 1)
            pw = PR.get(g, 1)
            s += pw * asy * r * r
            w += pw
        elif v > 1e-12:
            ref = REF.get(g, REF["default"])
            s += 0.75 * (v / ref) ** 2
            w += 0.75
    return s / w if w else 0


def caps(T, a, gs, od):
    return all(
        a[gs.index(g)] <= t * (1 + od.get(g, 50) / 100) + 1e-6
        for g, t in T.items()
        if t > 0 and g in gs
    )


def wmd(T, a, gs):
    m = [g for g in MAC if T.get(g, 0) > 0]
    return float(
        np.sqrt(np.mean([((a[gs.index(g)] if g in gs else 0) - T[g]) ** 2 / T[g] ** 2 for g in m]))
    )


def polish_feasible(gs, A, T, od, doses, max_pass=4, window=12):
    """0.001 grid local search; only cap-feasible moves (matches TS solver polish)."""
    step = 0.001
    best = [round(float(d), 3) for d in doses]
    ab = A @ np.array(best)
    best_obj = obj(gs, T, ab)
    if not caps(T, ab, gs, od):
        best_obj = float("inf")

    for _ in range(max_pass):
        for j in range(len(best)):
            for d in range(-window, window + 1):
                if d == 0:
                    continue
                trial = best[:]
                trial[j] = round(max(0.0, min(4.0, trial[j] + d * step)), 3)
                at = A @ np.array(trial)
                if not caps(T, at, gs, od):
                    continue
                ot = obj(gs, T, at)
                if ot < best_obj:
                    best_obj = ot
                    best = trial
                    ab = at
    return best, float(best_obj), ab


def optimize(case):
    gs, A = mat(case)
    T = case["inputs"]["target_mg_l"]
    od = case["inputs"]["overdose_pct"]
    n = A.shape[1]
    cons = [
        {"type": "ineq", "fun": (lambda x, i=i, t=t, g=g: t * (1 + od.get(g, 50) / 100) - A[i] @ x)}
        for i, g in enumerate(gs)
        for t in [T.get(g, 0)]
        if t > 0
    ]

    def run(f):
        best = None
        best_x = None
        for s in range(30):
            x0 = np.random.RandomState(s).uniform(0, 2, n) if s else np.ones(n)
            r = minimize(
                f,
                x0,
                bounds=[(0, 4)] * n,
                constraints=cons,
                method="SLSQP",
                options={"maxiter": 500, "ftol": 1e-12},
            )
            a = A @ r.x
            if caps(T, a, gs, od) and (best is None or f(r.x) < best):
                best = f(r.x)
                best_x = r.x
        if best_x is None:
            r = minimize(
                lambda x: f(x) + 1e3 * sum(max(0, -c["fun"](x)) ** 2 for c in cons),
                np.ones(n),
                bounds=[(0, 4)] * n,
                method="L-BFGS-B",
            )
            best_x = r.x
            best = f(r.x)
        return best_x, best, A @ best_x

    xb, _ob, _ab = run(lambda x: obj(gs, T, A @ x))
    best_d, best_o, best_a = None, float("inf"), None
    for seed in (xb, np.ones(n), np.zeros(n)):
        doses, ob, ab = polish_feasible(gs, A, T, od, seed, max_pass=5, window=24)
        if caps(T, ab, gs, od) and ob < best_o:
            best_d, best_o, best_a = doses, ob, ab
    if best_d is None:
        doses = [round(float(v), 3) for v in xb]
        ab = A @ np.array(doses)
        best_d, best_o, best_a = doses, obj(gs, T, ab), ab
    else:
        best_d, best_o, best_a = best_d, best_o, best_a
    doses, ob, ab = best_d, best_o, best_a
    return {
        "objective": float(ob),
        "macro_wmd": wmd(T, ab, gs),
        "cap_feasible": caps(T, ab, gs, od),
        "doses": doses,
    }


def main():
    cases = json.loads(CASES_PATH.read_text())["cases"]
    out = {
        "generator": "tests/fixtures/nutrient-golden/generate-reference-optima.py",
        "method": "scipy SLSQP, 30 starts, max dose 4",
        "cases": {},
        "notes": {
            "case08_olk_veg_master181818": "Hydroodo GUI exceeds Cu cap (~0.052 vs 0.03 limit at 50% OD on 0.02 target)",
        },
    }
    for c in cases:
        cid = c["id"]
        if c["outputs"]["status"] != "ok":
            out["cases"][cid] = {"status": c["outputs"]["status"], "objective": None}
            continue
        opt = optimize(c)
        out["cases"][cid] = opt
    OUT_PATH.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
