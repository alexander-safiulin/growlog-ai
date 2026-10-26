import type { NutrientHelpLocaleContent } from './types';
import { collectTranslatableHelpStrings, isLikelyLatex } from './collect-translatable-strings';
import { getNutrientHelpContent } from './loader';

export const NUTRIENT_HELP_PRODUCT_LOCALES = ['en', 'ru', 'fr', 'de', 'es', 'it', 'th', 'vi'] as const;

export type HelpLocaleParityIssue =
  | { kind: 'missing_locale' }
  | { kind: 'section_ids'; expected: string[]; actual: string[] }
  | { kind: 'untranslated'; samples: string[] }
  | { kind: 'map_gap'; missing: string[] };

export function auditNutrientHelpLocaleParity(
  baseline: NutrientHelpLocaleContent,
  locale: string,
): HelpLocaleParityIssue[] {
  const content = getNutrientHelpContent(locale);
  if (!content) return [{ kind: 'missing_locale' }];

  const issues: HelpLocaleParityIssue[] = [];
  const baseIds = baseline.sections.map((s) => s.id);
  const ids = content.sections.map((s) => s.id);
  if (JSON.stringify(ids) !== JSON.stringify(baseIds)) {
    issues.push({ kind: 'section_ids', expected: baseIds, actual: ids });
  }

  if (locale === 'en') return issues;

  const enStrings = new Set(collectTranslatableHelpStrings(baseline));
  const untranslated = collectTranslatableHelpStrings(content).filter(
    (t) => enStrings.has(t) && !isLikelyLatex(t) && t.trim().length > 4,
  );
  if (untranslated.length > 0) {
    issues.push({ kind: 'untranslated', samples: [...new Set(untranslated)].slice(0, 12) });
  }

  return issues;
}

export function assertAllHelpLocalesEquivalentToEnglish(): void {
  const en = getNutrientHelpContent('en');
  if (!en) throw new Error('English help missing');

  for (const code of NUTRIENT_HELP_PRODUCT_LOCALES) {
    if (code === 'en') continue;
    const issues = auditNutrientHelpLocaleParity(en, code);
    if (issues.length === 0) continue;
    const msg = issues.map((i) => JSON.stringify(i)).join('; ');
    throw new Error(`Help locale "${code}" parity failed: ${msg}`);
  }
}
