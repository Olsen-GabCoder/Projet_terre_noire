import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../../docs/audit-premium/VAGUE1/snapshots-P4.1');
mkdirSync(outDir, { recursive: true });
const BASE = 'http://localhost:5173';

const tests = [
  { name: 'home', path: '/', tabs: 5 },
  { name: 'catalog', path: '/catalog', tabs: 8 },
  { name: 'login', path: '/login', tabs: 4 },
  { name: 'contact', path: '/contact', tabs: 6 },
];

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const results = [];

  for (const t of tests) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);

    // Tab through elements
    const focusedElements = [];
    for (let i = 0; i < t.tabs; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString() || '').slice(0, 50),
          text: (el.textContent || '').trim().slice(0, 30),
          outline: style.outline,
          boxShadow: (style.boxShadow || 'none').slice(0, 50),
        };
      });
      if (info) focusedElements.push(info);
    }

    // Screenshot with last focused element visible
    await page.screenshot({
      path: resolve(outDir, `${t.name}--focus.png`),
    });
    console.log(`\n  === ${t.name} (${t.path}) ===`);
    for (const el of focusedElements) {
      const hasRing = el.outline.includes('rgb(232, 96, 28)') || el.outline.includes('#E8601C');
      const hasShadow = el.boxShadow !== 'none';
      const status = hasRing || hasShadow ? 'VISIBLE' : 'NO RING';
      console.log(`    ${status} | <${el.tag}> .${el.cls} | "${el.text}" | outline=${el.outline}`);
    }
    results.push({ page: t.name, elements: focusedElements });

    await page.close();
  }

  await ctx.close();
  await browser.close();
  console.log('\nDone.');
}

run().catch(console.error);
