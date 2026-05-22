import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../../docs/audit-premium/snapshots-before-supplement');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5173';
const API  = 'http://localhost:8000';
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

    // Step 1: Login via API directly, then inject tokens into localStorage
    console.log(`  [${vp.n}] Logging in via API...`);
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });

    const tokens = await page.evaluate(async (creds) => {
      try {
        const resp = await fetch(`${creds.api}/api/users/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: creds.email, password: creds.password }),
        });
        const data = await resp.json();
        if (data.access) {
          localStorage.setItem('access_token', data.access);
          if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
          return { ok: true, access: data.access.slice(0, 20) + '...' };
        }
        return { ok: false, error: JSON.stringify(data).slice(0, 100) };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }, { api: API, email, password });

    if (!tokens.ok) {
      console.log(`  Login failed: ${tokens.error}`);
      await ctx.close();
      continue;
    }
    console.log(`  Token set: ${tokens.access}`);

    // Step 2: Navigate to each auth page (token is now in localStorage)
    const pages_list = [
      { name: 'auth-profile', path: '/profile' },
      { name: 'auth-settings', path: '/settings' },
      { name: 'auth-orders', path: '/orders' },
    ];

    for (const pg of pages_list) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        // Wait for AuthContext to verify token and set user
        await page.waitForTimeout(2500);
        const finalUrl = page.url();
        const hasUser = await page.evaluate(() => {
          return document.body.innerText.length > 500;
        });
        console.log(`  ${pg.name} -> ${finalUrl} (content: ${hasUser ? 'YES' : 'minimal'})`);
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
