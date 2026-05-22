/**
 * VAGUE 1 — Script de snapshots visuels (avant/après)
 *
 * Usage :
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *   node scripts/snapshot.mjs before
 *   node scripts/snapshot.mjs after
 *
 * Les captures sont sauvegardées dans :
 *   docs/audit-premium/snapshots-before/  (ou snapshots-after/)
 */

import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2] || 'before';
const outDir = resolve(__dirname, `../../docs/audit-premium/snapshots-${phase}`);
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5173';

const pages = [
  { name: 'home', path: '/' },
  { name: 'catalog', path: '/catalog' },
  { name: 'authors', path: '/authors' },
  { name: 'cart', path: '/cart' },
  { name: 'wishlist', path: '/wishlist' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'profile', path: '/profile' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'faq', path: '/faq' },
  { name: 'privacy', path: '/privacy' },
  { name: 'cgv', path: '/cgv' },
  { name: 'delivery', path: '/delivery' },
  { name: 'notfound', path: '/this-page-does-not-exist' },
];

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function run() {
  console.log(`\n=== Snapshots ${phase.toUpperCase()} ===\n`);
  console.log(`Output: ${outDir}\n`);

  const browser = await chromium.launch();

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    for (const pg of pages) {
      const page = await context.newPage();
      const url = `${BASE}${pg.path}`;
      const filename = `${pg.name}--${vp.name}.png`;

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

        // --- V2 improvements (activated via --stable flag) ---
        if (process.argv.includes('--stable')) {
          // Wait for all images to finish loading
          await page.evaluate(() => Promise.all(
            Array.from(document.images)
              .filter(img => !img.complete)
              .map(img => new Promise(r => { img.onload = r; img.onerror = r; }))
          ));
          // Freeze animations/transitions for deterministic capture
          await page.addStyleTag({ content: `
            *, *::before, *::after {
              animation: none !important;
              transition: none !important;
            }
          `});
          // Extra settle time after freezing
          await page.waitForTimeout(500);
        } else {
          // Original behavior: wait for animations to settle
          await page.waitForTimeout(1500);
        }

        await page.screenshot({
          path: resolve(outDir, filename),
          fullPage: true,
        });
        console.log(`  OK  ${filename}`);
      } catch (err) {
        console.log(`  FAIL ${filename} — ${err.message.slice(0, 80)}`);
      }
      await page.close();
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nDone. ${viewports.length * pages.length} screenshots in ${outDir}\n`);
}

run().catch(console.error);
