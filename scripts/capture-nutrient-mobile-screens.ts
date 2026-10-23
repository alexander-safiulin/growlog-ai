/**
 * Capture mobile-width screenshots of each nutrient calculator tab (requires dev server).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = '/opt/cursor/artifacts/screenshots';
const base = process.env.NUTRIENT_SCREEN_BASE_URL ?? 'http://localhost:3000/nutrient/calculator';
const tabs = ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'] as const;

mkdirSync(outDir, { recursive: true });

for (const tab of tabs) {
  const url = `${base}?tab=${tab}`;
  const file = path.join(outDir, `nutrient-mobile-${tab}.png`);
  execFileSync(
    'npx',
    [
      '--yes',
      'playwright@1.52.0',
      'screenshot',
      '--viewport-size=390,844',
      url,
      file,
    ],
    { stdio: 'inherit' },
  );
  console.log('saved', file);
}
