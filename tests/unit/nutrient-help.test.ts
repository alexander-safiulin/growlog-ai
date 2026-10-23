import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeNutrientHelpExamples } from '@/lib/nutrient/help/compute-examples';
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
    expect(oxideEx!.lines.some((l) => l.includes(CANONICAL_OXIDE_FACTORS.K2O.factor.toFixed(4)))).toBe(
      true,
    );
  });

  it('context map resolves to help anchors', () => {
    const ru = getNutrientHelpContent('ru')!;
    expect(nutrientHelpSectionHref(ru.contextMap.water)).toBe('/nutrient/help#water');
    expect(nutrientHelpSectionHref(ru.contextMap.results)).toBe('/nutrient/help#deviations');
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
