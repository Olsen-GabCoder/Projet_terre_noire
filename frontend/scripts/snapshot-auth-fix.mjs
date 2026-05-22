import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../../docs/audit-premium/snapshots-before-supplement');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5173';
const env = readFileSync(resolve(__dirname, '../../backend/.env'), 'utf-8');
const email = env.match(/CREATE_ADMIN_EMAIL=(.+)/)?.[1]?.trim();
const password = env.match(/CREATE_ADMIN_PASSWORD=(.+)/)?.[1]?.trim();

async function run() {
  const browser = await chromium.launch();

  for (const vp of [{ w: 1440, h: 900, n: 'desktop' }, { w: 375, h: 812, n: 'mobile' }]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // Login
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForTimeout(3000);
    console.log(`  Logged in (${vp.n}), URL: ${page.url()}`);

    // Navigate explicitly to each auth-required page
    const pages = [
      { name: 'auth-settings', path: '/settings' },
      { name: 'auth-orders', path: '/orders' },
      { name: 'auth-profile', path: '/profile' },
    ];

    for (const pg of pages) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1500);
        console.log(`  ${pg.name} -> ${page.url()}`);
        await page.screenshot({
          path: resolve(outDir, `${pg.name}--${vp.n}.png`),
          fullPage: true,
        });
        console.log(`  OK  ${pg.name}--${vp.n}`);
      } catch (e) {
        console.log(`  FAIL ${pg.name}: ${e.message.slice(0, 60)}`);
      }
    }

    await page.close();
    await ctx.close();
  }

  await browser.close();
  console.log('Done.');
}

run().catch(console.error);
