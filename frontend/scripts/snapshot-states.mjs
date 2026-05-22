/**
 * VAGUE 1 — Snapshots d'états interactifs et pages dynamiques
 *
 * Usage :
 *   node scripts/snapshot-states.mjs before
 *   node scripts/snapshot-states.mjs after
 *
 * Captures :
 *   - BookDetail (premier livre du catalogue)
 *   - Header drawer mobile ouvert
 *   - Cart avec items (via localStorage injection)
 *   - Admin dashboard (si accessible)
 */

import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2] || 'before';
const outDir = resolve(__dirname, `../../docs/audit-premium/snapshots-${phase}-supplement`);
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5173';

async function captureState(browser, name, width, height, setupFn) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  try {
    await setupFn(page);
    await page.waitForTimeout(1500);
    const vp = width <= 500 ? 'mobile' : 'desktop';
    const filename = `${name}--${vp}.png`;
    await page.screenshot({ path: resolve(outDir, filename), fullPage: true });
    console.log(`  OK  ${filename}`);
  } catch (e) {
    const vp = width <= 500 ? 'mobile' : 'desktop';
    console.log(`  FAIL ${name}--${vp}: ${e.message.slice(0, 80)}`);
  }
  await page.close();
  await ctx.close();
}

async function run() {
  console.log(`\n=== State Snapshots ${phase.toUpperCase()} ===\n`);
  console.log(`Output: ${outDir}\n`);

  const browser = await chromium.launch();

  // 1. BookDetail — navigate to catalog, find first book link, click it
  for (const w of [1440, 375]) {
    await captureState(browser, 'bookdetail', w, w === 375 ? 812 : 900, async (page) => {
      await page.goto(`${BASE}/catalog`, { waitUntil: 'networkidle', timeout: 15000 });
      // Find first book card link
      const bookLink = await page.$('a[href*="/books/"]');
      if (bookLink) {
        const href = await bookLink.getAttribute('href');
        await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle', timeout: 15000 });
      } else {
        throw new Error('No book link found on catalog page');
      }
    });
  }

  // 2. Header drawer mobile — open hamburger menu
  await captureState(browser, 'header-drawer', 375, 812, async (page) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    // Click the burger/menu button
    const burger = await page.$('.tn-header__burger, .tn-header__menu-btn, [aria-label*="menu"], [aria-label*="Menu"], button.tn-burger');
    if (burger) {
      await burger.click();
      await page.waitForTimeout(800);
    } else {
      throw new Error('No burger button found');
    }
  });

  // 3. Cart with items — inject cart data into localStorage then navigate
  for (const w of [1440, 375]) {
    await captureState(browser, 'cart-filled', w, w === 375 ? 812 : 900, async (page) => {
      // First visit catalog to get a real book
      await page.goto(`${BASE}/catalog`, { waitUntil: 'networkidle', timeout: 15000 });

      // Try to add items via clicking "Add to cart" buttons
      const addBtns = await page.$$('.tn-book-card__cart-btn, .tn-book-card button, [class*="add-to-cart"]');
      if (addBtns.length >= 2) {
        await addBtns[0].click();
        await page.waitForTimeout(500);
        await addBtns[1].click();
        await page.waitForTimeout(500);
      } else if (addBtns.length >= 1) {
        await addBtns[0].click();
        await page.waitForTimeout(500);
      }

      // Navigate to cart
      await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle', timeout: 15000 });
    });
  }

  // 4. Admin dashboard — attempt (may redirect to login if not authenticated)
  for (const w of [1440, 375]) {
    await captureState(browser, 'admin', w, w === 375 ? 812 : 900, async (page) => {
      await page.goto(`${BASE}/admin-dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    });
  }

  await browser.close();
  console.log(`\nDone — state snapshots in ${outDir}\n`);
}

run().catch(console.error);
