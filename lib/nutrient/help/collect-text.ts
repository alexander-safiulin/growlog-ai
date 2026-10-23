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
  opts: { insideCurious?: boolean } = {},
): Array<{ text: string; insideCurious: boolean }> {
  const out: Array<{ text: string; insideCurious: boolean }> = [];
  const inside = opts.insideCurious ?? false;

  for (const block of blocks) {
    if (block.type === 'curious') {
      out.push(...collectHelpStrings(block.blocks, { insideCurious: true }));
      continue;
    }
    if (block.type === 'example' || block.type === 'link') {
      if (block.type === 'link') out.push({ text: block.text, insideCurious: inside });
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
    chunks.push(...collectHelpStrings(section.blocks).map((x) => x.text));
  }
  return chunks;
}
