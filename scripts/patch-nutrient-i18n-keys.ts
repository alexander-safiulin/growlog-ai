import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'lib/i18n/messages');
const enPath = path.join(dir, 'en.ts');
const enSrc = readFileSync(enPath, 'utf8');

function extractBlock(src: string, key: string): string {
  const re = new RegExp(`    ${key}: \\{[\\s\\S]*?\\n    \\},`);
  const m = src.match(re);
  if (!m) throw new Error(`missing ${key} in en`);
  return m[0];
}

const solutionsBlock = extractBlock(enSrc, 'solutions');
const productFiltersBlock = extractBlock(enSrc, 'productFilters');
const systemsBlock = extractBlock(enSrc, 'systems');
const waterBlock = extractBlock(enSrc, 'water');
const elementsBlock = extractBlock(enSrc, 'elements');

for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'en.ts')) {
  let src = readFileSync(path.join(dir, file), 'utf8');
  src = src.replace(/    solutions: \{[\s\S]*?\n    \},/, solutionsBlock);
  if (!src.includes('productFilters:')) {
    src = src.replace(/    favorites: \{/, `${productFiltersBlock}\n    favorites: {`);
  } else {
    src = src.replace(/    productFilters: \{[\s\S]*?\n    \},/, productFiltersBlock);
  }
  src = src.replace(/    systems: \{[\s\S]*?\n    \},/, systemsBlock);
  src = src.replace(/    water: \{[\s\S]*?\n    \},/, waterBlock);
  src = src.replace(/    elements: \{[\s\S]*?\n    \},/, elementsBlock);
  writeFileSync(path.join(dir, file), src);
  console.log('patched', file);
}
