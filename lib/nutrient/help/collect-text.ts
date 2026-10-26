import { examplesById } from './compute-examples';
import type { NutrientHelpBlock, NutrientHelpInnerBlock, NutrientHelpLocaleContent } from './types';

function innerText(block: NutrientHelpInnerBlock): string[] {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return [block.text];
    case 'list':
      return block.items;
    case 'math':
      return [block.latex];
    default:
      return [];
  }
}

export function collectHelpStrings(
  blocks: NutrientHelpBlock[],
  opts: { insideCurious?: boolean; exampleLocale?: string } = {},
): Array<{ text: string; insideCurious: boolean }> {
  const out: Array<{ text: string; insideCurious: boolean }> = [];
  const inside = opts.insideCurious ?? false;

  for (const block of blocks) {
    if (block.type === 'curious') {
      out.push(...collectHelpStrings(block.blocks, { insideCurious: true, exampleLocale: opts.exampleLocale }));
      continue;
    }
    if (block.type === 'example') {
      const ex = examplesById(opts.exampleLocale)[block.exampleId];
      if (ex) {
        out.push({ text: ex.title, insideCurious: inside });
        for (const line of ex.lines) out.push({ text: line, insideCurious: inside });
      }
      continue;
    }
    if (block.type === 'link') {
      out.push({ text: block.text, insideCurious: inside });
      continue;
    }
    for (const t of innerText(block)) {
      out.push({ text: t, insideCurious: inside });
    }
  }
  return out;
}

export function collectLocalePublicText(content: NutrientHelpLocaleContent): string[] {
  const chunks = [content.pageTitle, content.pageIntro];
  for (const section of content.sections) {
    chunks.push(section.title, section.summary);
    chunks.push(...collectHelpStrings(section.blocks, { exampleLocale: content.locale }).map((x) => x.text));
  }
  return chunks;
}
