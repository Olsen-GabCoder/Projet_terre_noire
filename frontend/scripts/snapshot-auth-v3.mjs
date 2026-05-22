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

    // Login via UI form
    console.log(`  [${vp.n}] Logging in via UI...`);
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect away from /login
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    } catch {
      console.log('  Still on login — trying Enter key');
      await page.press('input[type="password"]', 'Enter');
      await page.waitForTimeout(3000);
    }
    await page.waitForTimeout(2000);

    // Verify token exists
    const hasToken = await page.evaluate(() => !!localStorage.getItem('access_token'));
    console.log(`  Token in localStorage: ${hasToken}, URL: ${page.url()}`);

    if (!hasToken) {
      console.log('  Login failed — skipping auth captures');
      await ctx.close();
      continue;
    }

    // Navigate to each page
    const targets = [
      { name: 'auth-profile', path: '/profile' },
      { name: 'auth-settings', path: '/settings' },
      { name: 'auth-orders', path: '/orders' },
    ];

    for (const pg of targets) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        // Give AuthContext time to verify token and set user
        await page.waitForTimeout(3000);

        // Check if we got redirected back to login
        if (page.url().includes('/login')) {
          console.log(`  ${pg.name}: redirected to login — auth lost`);
          continue;
        }

        await page.screenshot({
          path: resolve(outDir, `${pg.name}--${vp.n}.png`),
          fullPage: true,
        });
        console.log(`  OK  ${pg.name}--${vp.n} (${page.url()})`);
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
