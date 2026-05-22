import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../../docs/audit-premium/VAGUE1/snapshots-A6-after');
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

    // Login via UI
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    } catch { /* fallback */ }
    await page.waitForTimeout(3000);
    console.log(`  [${vp.n}] Logged in: ${page.url()}`);

    // Admin pages via pushState (preserves auth context)
    const adminPages = [
      { name: 'admin-dashboard', path: '/admin-dashboard' },
      { name: 'admin-books', path: '/admin-dashboard/books' },
      { name: 'admin-orders', path: '/admin-dashboard/orders' },
      { name: 'admin-manuscripts', path: '/admin-dashboard/manuscripts' },
    ];

    for (const pg of adminPages) {
      try {
        await page.evaluate((p) => {
          window.history.pushState({}, '', p);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, pg.path);
        await page.waitForTimeout(2500);
        await page.screenshot({
          path: resolve(outDir, `${pg.name}--${vp.n}.png`),
          fullPage: true,
        });
        console.log(`  OK  ${pg.name}--${vp.n}`);
      } catch (e) {
        console.log(`  FAIL ${pg.name}: ${e.message.slice(0, 60)}`);
      }
    }

    // Newsletter pages (no auth needed, navigate directly)
    await page.goto(`${BASE}/newsletter/confirm/success`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: resolve(outDir, `newsletter-confirm--${vp.n}.png`), fullPage: true });
    console.log(`  OK  newsletter-confirm--${vp.n}`);

    await page.goto(`${BASE}/newsletter/unsubscribe/success`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: resolve(outDir, `newsletter-unsub--${vp.n}.png`), fullPage: true });
    console.log(`  OK  newsletter-unsub--${vp.n}`);

    await page.close();
    await ctx.close();
  }

  await browser.close();
  console.log('Done.');
}

run().catch(console.error);
