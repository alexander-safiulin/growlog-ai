/**
 * Fit classic catalog recipe salt doses to profile target_ppm (macros, <=5% rel error).
 * Run: pnpm exec tsx scripts/nutrient-import/fit-classic-recipe-doses.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardPpmFromCatalogRecipeLines } from '../../packages/nutrient-calc/src/catalog-db.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLASSICS = path.join(ROOT, 'supabase/seed/nutrient/classics.json');

type Line = { ingredient_label: string; dose_per_l: number; declared_pct: Record<string, number> };

const SALTS: Record<string, Record<string, number>> = {
  KNO3: { NO3: 13.86, K: 38.67 },
  'Ca(NO3)2·4H2O': { NO3: 11.86, Ca: 16.98 },
  'MgSO4·7H2O': { S: 13.01, Mg: 9.86 },
  KH2PO4: { P: 22.76, K: 28.73 },
  K2SO4: { K2O: 53, S: 18 },
  NH4H2PO4: { NH4: 11.86, P: 26.92 },
  '(NH4)2SO4': { NH4: 21.2, S: 24.26 },
  'CaCl2·2H2O': { Ca: 27.26 },
  NaNO3: { NO3: 16.47 },
};

const MACRO_KEYS = ['N_NO3', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

function macroActual(actual: Record<string, number>, k: string): number {
  if (k === 'N_NO3') return actual.N_NO3 ?? actual.N ?? 0;
  return actual[k] ?? 0;
}

function maxRelErr(target: Record<string, number>, actual: Record<string, number>): number {
  let max = 0;
  for (const k of MACRO_KEYS) {
    const t = target[k] ?? 0;
    if (t <= 0) continue;
    max = Math.max(max, Math.abs(macroActual(actual, k) - t) / t);
  }
  return max;
}

function forward(lines: Line[]): Record<string, number> {
  return forwardPpmFromCatalogRecipeLines(lines, 'canonical');
}

function solveNonnegativeMacros(
  target: Record<string, number>,
  saltNames: string[],
): number[] {
  const t = MACRO_KEYS.map((k) => target[k] ?? 0);
  const cols = saltNames.map((name) => {
    const pct = SALTS[name];
    return MACRO_KEYS.map((k) => {
      if (k === 'N_NO3') return 10 * ((pct.NO3 ?? 0) / 100);
      if (k === 'P') return 10 * ((pct.P ?? 0) / 100);
      if (k === 'K') return 10 * ((pct.K ?? 0) / 100 + (pct.K2O ?? 0) / 100 * 0.83);
      if (k === 'Ca') return 10 * ((pct.Ca ?? 0) / 100);
      if (k === 'Mg') return 10 * ((pct.Mg ?? 0) / 100 + (pct.MgO ?? 0) / 100 * 0.6);
      if (k === 'S') return 10 * ((pct.S ?? 0) / 100);
      return 0;
    });
  });

  let doses = saltNames.map(() => 0.1);
  for (let iter = 0; iter < 20000; iter++) {
    const achieved = cols.map((col) => 0).map((_, j) =>
      cols.reduce((sum, col, i) => sum + col[j] * doses[i], 0),
    );
    let improved = false;
    for (let i = 0; i < doses.length; i++) {
      for (const dir of [-1, 1]) {
        const trial = doses.slice();
        trial[i] = Math.max(0, trial[i] + dir * 0.002);
        const a = cols.map((col) => col.reduce((s, c, j) => s + c * trial[j], 0));
        const err = Math.max(...t.map((tv, j) => (tv > 0 ? Math.abs(a[j] - tv) / tv : 0)));
        const err0 = Math.max(...t.map((tv, j) => (tv > 0 ? Math.abs(achieved[j] - tv) / tv : 0)));
        if (err < err0) {
          doses = trial;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return doses.map((d) => Math.round(d * 10000) / 10000);
}

function fitRecipeOnce(
  target: Record<string, number>,
  saltNames: string[],
  initial: number[],
  maxIters = 12000,
): Line[] {
  const doses = initial.slice();
  const lines = (): Line[] =>
    saltNames.map((name, i) => ({
      ingredient_label: name,
      dose_per_l: doses[i],
      declared_pct: SALTS[name],
    }));

  let bestErr = maxRelErr(target, forward(lines()));
  let step = 0.05;

  for (let iter = 0; iter < maxIters; iter++) {
    let improved = false;
    for (let i = 0; i < doses.length; i++) {
      for (const dir of [-1, 1]) {
        const trial = doses.slice();
        trial[i] = Math.max(0, Math.round((trial[i] + dir * step) * 10000) / 10000);
        const err = maxRelErr(
          target,
          forward(saltNames.map((name, j) => ({
            ingredient_label: name,
            dose_per_l: trial[j],
            declared_pct: SALTS[name],
          }))),
        );
        if (err < bestErr - 1e-9) {
          doses[i] = trial[i];
          bestErr = err;
          improved = true;
        }
      }
    }
    if (!improved) {
      step *= 0.5;
      if (step < 0.0002) break;
    }
    if (bestErr <= 0.048) break;
  }

  return saltNames.map((name, i) => ({
    ingredient_label: name,
    dose_per_l: Math.round(doses[i] * 10000) / 10000,
    declared_pct: SALTS[name],
  }));
}

function fitRecipe(
  target: Record<string, number>,
  saltNames: string[],
  initials: number[][],
): Line[] {
  let bestLines = fitRecipeOnce(target, saltNames, initials[0]);
  let bestErr = maxRelErr(target, forward(bestLines));
  for (const init of initials.slice(1)) {
    const lines = fitRecipeOnce(target, saltNames, init);
    const err = maxRelErr(target, forward(lines));
    if (err < bestErr) {
      bestErr = err;
      bestLines = lines;
    }
  }
  for (let r = 0; r < 120; r++) {
    const init = saltNames.map(() => Math.random() * 1.4);
    const lines = fitRecipeOnce(target, saltNames, init, 10000);
    const err = maxRelErr(target, forward(lines));
    if (err < bestErr) {
      bestErr = err;
      bestLines = lines;
    }
  }
  return bestLines;
}

function main() {
  const classics = JSON.parse(readFileSync(CLASSICS, 'utf8'));

  const hoagland = classics.profiles.find((p: { slug: string }) => p.slug === 'hoagland-standard');
  classics.catalog_recipes = classics.catalog_recipes.map((r: { slug: string; profile_slug: string }) => {
    const profile = classics.profiles.find((p: { slug: string }) => p.slug === r.profile_slug);
    if (r.slug === 'hoagland-standard-salts') {
      return {
        ...r,
        lines: [
          { ingredient_label: 'KNO3', dose_per_l: 0.506, declared_pct: SALTS.KNO3 },
          { ingredient_label: 'Ca(NO3)2·4H2O', dose_per_l: 1.181, declared_pct: SALTS['Ca(NO3)2·4H2O'] },
          { ingredient_label: 'MgSO4·7H2O', dose_per_l: 0.493, declared_pct: SALTS['MgSO4·7H2O'] },
          { ingredient_label: 'KH2PO4', dose_per_l: 0.136, declared_pct: SALTS.KH2PO4 },
        ],
      };
    }
    if (r.slug === 'long-ashton-salts') {
      const saltNames = ['KNO3', 'Ca(NO3)2·4H2O', 'NaNO3', 'MgSO4·7H2O', 'KH2PO4', 'K2SO4'];
      const solved = solveNonnegativeMacros(profile.target_ppm, saltNames);
      const lines = fitRecipe(profile.target_ppm, saltNames, [solved, solved.map((d) => d * 1.05)]);
      return { ...r, lines };
    }
    if (r.slug === 'cornell-lettuce-salts') {
      const saltNames = [
        'Ca(NO3)2·4H2O',
        'CaCl2·2H2O',
        'KNO3',
        'NaNO3',
        'MgSO4·7H2O',
        'KH2PO4',
        'K2SO4',
      ];
      const solved = solveNonnegativeMacros(profile.target_ppm, saltNames);
      const lines = fitRecipe(profile.target_ppm, saltNames, [solved, solved.map((d) => d * 1.02)]);
      return { ...r, lines };
    }
    if (r.slug === 'ufl-hs796-tomato-veg-salts') {
      const saltNames = [
        'KNO3',
        'Ca(NO3)2·4H2O',
        'CaCl2·2H2O',
        'NaNO3',
        'MgSO4·7H2O',
        'KH2PO4',
        'K2SO4',
      ];
      const solved = solveNonnegativeMacros(profile.target_ppm, saltNames);
      const lines = fitRecipe(profile.target_ppm, saltNames, [solved, solved.map((d) => d * 1.02)]);
      return { ...r, lines };
    }
    return r;
  });

  for (const r of classics.catalog_recipes) {
    const profile = classics.profiles.find((p: { slug: string }) => p.slug === r.profile_slug);
    const ppm = forward(r.lines);
    const err = maxRelErr(profile.target_ppm, ppm);
    console.log(r.slug, 'max rel err', (err * 100).toFixed(2) + '%', ppm);
    if (err > 0.05) {
      throw new Error(`${r.slug} did not reach 5% macro tolerance (max rel ${err})`);
    }
  }

  writeFileSync(CLASSICS, JSON.stringify(classics, null, 2) + '\n');
  console.log('Updated', CLASSICS);
}

main();
