/** Run fill-locale-from-de in chunks to avoid rate limits. */
import { spawnSync } from 'node:child_process';

const locale = process.argv[2];
const mode = process.argv.includes('--full') ? '--full' : '';
if (!locale) {
  console.error('usage: fill-locale-chunk.ts <locale> [--full]');
  process.exit(1);
}

const r = spawnSync('npx', ['tsx', 'scripts/fill-locale-from-de.ts', locale, mode], {
  stdio: 'inherit',
  cwd: process.cwd(),
});
process.exit(r.status ?? 1);
