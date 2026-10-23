import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeNutrientHelpExamples } from '@/lib/nutrient/help/compute-examples';
import {
  findBannedTermsInGrowerText,
  NUTRIENT_HELP_CURIOUS_ONLY_FRAGMENTS,
} from '@/lib/nutrient/help/banned-terms';
import { collectHelpStrings } from '@/lib/nutrient/help/collect-text';
import { getNutrientHelpContent, nutrientHelpSectionHref } from '@/lib/nutrient/help/loader';
import { CANONICAL_OXIDE_FACTORS, solveForward, type FertilizerSpec } from '@growlog/nutrient-calc';

describe('nutrient help content', () => {
  it('loads Russian locale with all required sections', () => {
    const content = getNutrientHelpContent('ru');
    expect(content).toBeTruthy();
    const ids = content!.sections.map((s) => s.id);
    expect(ids).toContain('quick-start');
    expect(ids).toContain('solver');
    expect(ids).toContain('wand');
    expect(ids).toContain('deviations');
    expect(ids).toContain('faq');
    expect(content!.contextMap.wand).toBe('wand');
    expect(content!.contextMap.results).toBe('deviations');
  });

  it('help page module exists', () => {
    const src = readFileSync(path.join(process.cwd(), 'pages/nutrient/help.tsx'), 'utf8');
    expect(src).toContain('/nutrient/help');
    expect(src).toContain('NutrientHelpPageContent');
  });

  it('worked examples match solver and oxide constants', () => {
    const examples = computeNutrientHelpExamples();
    const ppmEx = examples.find((e) => e.id === 'ppm-from-dose');
    expect(ppmEx).toBeTruthy();

    const kno3: FertilizerSpec = {
      id: 'help-kno3',
      name: 'KNO3',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { K2O: 46 },
      elementalPct: {},
    };
    const targetK = 150;
    const solveK = solveForward({
      target: { K: targetK },
      fertilizers: [kno3],
      options: { overdosePctByGroup: { K: 20 } },
    });
    const achievedK = solveK.best.achievedPpm.K ?? 0;
    expect(ppmEx!.lines.some((l) => l.includes(String(targetK)))).toBe(true);
    expect(achievedK).toBeGreaterThan(0);

    const oxideEx = examples.find((e) => e.id === 'oxide-factors');
    const k2oRu = CANONICAL_OXIDE_FACTORS.K2O.factor.toLocaleString('ru-RU', {
      maximumFractionDigits: 4,
    });
    expect(oxideEx!.lines.some((l) => l.includes(k2oRu))).toBe(true);
    expect(ppmEx!.lines.some((l) => l.includes('13%'))).toBe(true);
  });

  it('context map resolves to help anchors', () => {
    const ru = getNutrientHelpContent('ru')!;
    expect(nutrientHelpSectionHref(ru.contextMap.water)).toBe('/nutrient/help#water');
    expect(nutrientHelpSectionHref(ru.contextMap.results)).toBe('/nutrient/help#deviations');
  });

  it('Russian grower copy avoids dev terms outside «Для любопытных»', () => {
    const content = getNutrientHelpContent('ru')!;
    for (const t of [content.pageTitle, content.pageIntro]) {
      expect(findBannedTermsInGrowerText(t), t.slice(0, 80)).toEqual([]);
    }
    for (const section of content.sections) {
      for (const t of [section.title, section.summary]) {
        expect(findBannedTermsInGrowerText(t), t).toEqual([]);
      }
      for (const { text, insideCurious } of collectHelpStrings(section.blocks)) {
        const banned = findBannedTermsInGrowerText(text);
        expect(banned, `in: ${text.slice(0, 80)}`).toEqual([]);
        if (!insideCurious) {
          for (const frag of NUTRIENT_HELP_CURIOUS_ONLY_FRAGMENTS) {
            expect(
              text.toLowerCase().includes(frag.toLowerCase()),
              `fragment "${frag}" in: ${text.slice(0, 60)}`,
            ).toBe(false);
          }
        }
      }
    }
    const curiousTexts = collectHelpStrings(
      content.sections.flatMap((s) => s.blocks),
    ).filter((x) => x.insideCurious);
    expect(curiousTexts.length).toBeGreaterThan(0);
    expect(
      curiousTexts.some((x) => x.text.includes('многостартовый поиск')),
    ).toBe(true);
  });

  it('calculator shell references context help component', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'components/nutrient/NutrientCalculatorApp.tsx'),
      'utf8',
    );
    expect(src).toContain('NutrientContextHelpLink');
    expect(src).toContain('context={id}');
  });
});
