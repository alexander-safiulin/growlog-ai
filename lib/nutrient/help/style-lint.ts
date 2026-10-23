import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Grower help must not use telegraphic arrows or English "vs" shorthand. */
export function findRuHelpStyleViolations(jsonText: string): string[] {
  const violations: string[] = [];
  if (jsonText.includes('→')) violations.push('contains arrow (→)');
  if (jsonText.includes(' vs ')) violations.push('contains " vs "');
  return violations;
}

export function loadRuHelpJsonRaw(): string {
  return readFileSync(
    path.join(process.cwd(), 'lib/nutrient/help/locales/ru.json'),
    'utf8',
  );
}
