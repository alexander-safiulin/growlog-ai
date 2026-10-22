/**
 * Validate classic catalog recipes against classics.json target_ppm (no fitting).
 * Run: pnpm exec tsx scripts/nutrient-import/fit-classic-recipe-doses.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardPpmFromCatalogRecipeLines } from '../../packages/nutrient-calc/src/catalog-db.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLASSICS = path.join(ROOT, 'supabase/seed/nutrient/classics.json');

function macroActual(actual: Record<string, number>, k: string): number {
  if (k === 'N_NO3') return actual.N_NO3 ?? actual.N ?? 0;
  return actual[k] ?? 0;
}

function main() {
  const classics = JSON.parse(readFileSync(CLASSICS, 'utf8'));
  for (const recipe of classics.catalog_recipes ?? []) {
    const profile = classics.profiles.find(
      (p: { slug: string }) => p.slug === recipe.profile_slug,
    );
    if (!profile) throw new Error(`Missing profile for ${recipe.slug}`);
    const forward = forwardPpmFromCatalogRecipeLines(
      recipe.lines.filter((l: { dose_per_l: number }) => l.dose_per_l > 0),
      'canonical',
    );
    for (const [key, target] of Object.entries(profile.target_ppm) as [string, number][]) {
      if (target <= 0) continue;
      if (['Fe', 'B', 'Mn', 'Zn', 'Cu', 'Mo'].includes(key)) continue;
      const rel = Math.abs(macroActual(forward, key) - target) / target;
      if (rel > 0.05) {
        throw new Error(`${recipe.slug} ${key} off by ${(rel * 100).toFixed(1)}%`);
      }
    }
    console.log('ok', recipe.slug);
  }
}

main();
