/**
 * Prints worked-example lines from the real solver (used by help docs).
 * Run: pnpm tsx scripts/verify-nutrient-help-examples.ts
 */
import { computeNutrientHelpExamples } from '../lib/nutrient/help/compute-examples';

for (const ex of computeNutrientHelpExamples()) {
  console.log(`\n## ${ex.title} (${ex.id})`);
  for (const line of ex.lines) console.log(`- ${line}`);
}
