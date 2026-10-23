import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = process.env.SCREENSHOT_OUT ?? '/opt/cursor/artifacts/screenshots';
const base = process.env.SCREENSHOT_BASE ?? 'http://localhost:3000';
const prefix = process.env.SCREENSHOT_PREFIX ?? 'after';

mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'home', url: '/' },
  { name: 'login', url: '/login' },
  { name: 'sources', url: '/nutrient/sources' },
  ...['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'].map((tab) => ({
    name: `calc-${tab}`,
    url: `/nutrient/calculator?tab=${tab}`,
  })),
];

const viewports = [
  { tag: 'mobile', width: 390, height: 844 },
  { tag: 'desktop', width: 1280, height: 800 },
];

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.addInitScript((t) => {
      localStorage.setItem('theme', t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    }, theme);

    for (const p of pages) {
      await page.goto(`${base}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1500);
      const file = path.join(outDir, `${prefix}-${vp.tag}-${theme}-${p.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('saved', file);
    }
    await context.close();
  }
}
await browser.close();
