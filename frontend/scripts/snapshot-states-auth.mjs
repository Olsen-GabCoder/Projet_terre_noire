/**
 * VAGUE 1 — Snapshots authentifiés + BookReader + Checkout
 *
 * Usage :
 *   node scripts/snapshot-states-auth.mjs before
 *   node scripts/snapshot-states-auth.mjs after
 *
 * Reads admin credentials from backend/.env (CREATE_ADMIN_EMAIL / CREATE_ADMIN_PASSWORD)
 * Output: docs/audit-premium/snapshots-{phase}-supplement/
 */

import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2] || 'before';
const outDir = resolve(__dirname, `../../docs/audit-premium/snapshots-${phase}-supplement`);
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5173';
const API  = 'http://localhost:8000';

// Read credentials from backend/.env
function getEnvCredentials() {
  try {
    const env = readFileSync(resolve(__dirname, '../../backend/.env'), 'utf-8');
    const email = env.match(/CREATE_ADMIN_EMAIL=(.+)/)?.[1]?.trim();
    const password = env.match(/CREATE_ADMIN_PASSWORD=(.+)/)?.[1]?.trim();
    return { email, password };
  } catch {
    console.error('Could not read backend/.env');
    return { email: null, password: null };
  }
}

async function screenshot(page, name, vp) {
  const vpLabel = vp.width <= 500 ? 'mobile' : 'desktop';
  const filename = `${name}--${vpLabel}.png`;
  await page.screenshot({ path: resolve(outDir, filename), fullPage: true });
  console.log(`  OK  ${filename}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // Fill login form
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]');
  const passInput = await page.$('input[type="password"]');

  if (!emailInput || !passInput) {
    throw new Error('Login form inputs not found');
  }

  await emailInput.fill(email);
  await passInput.fill(password);

  // Submit
  const submitBtn = await page.$('button[type="submit"], .login-btn, button:has-text("Connexion"), button:has-text("connecter")');
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await passInput.press('Enter');
  }

  // Wait for navigation away from login
  await page.waitForTimeout(3000);
  const url = page.url();
  if (url.includes('/login')) {
    console.log('  WARN: Still on login page after submit — credentials may be wrong');
    return false;
  }
  console.log(`  Logged in, redirected to: ${url}`);
  return true;
}

async function run() {
  console.log(`\n=== Auth Snapshots ${phase.toUpperCase()} ===\n`);
  const { email, password } = getEnvCredentials();
  if (!email || !password) {
    console.error('Missing credentials in .env');
    process.exit(1);
  }
  console.log(`Credentials found for: ${email.slice(0, 3)}***\n`);

  const browser = await chromium.launch();

  for (const vp of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // Login
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      console.log(`  Skipping auth captures for ${vp.width}px — login failed`);
      await ctx.close();
      continue;
    }

    // 1. Settings
    try {
      await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'auth-settings', vp);
    } catch (e) { console.log(`  FAIL auth-settings: ${e.message.slice(0, 60)}`); }

    // 2. Orders
    try {
      await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'auth-orders', vp);
    } catch (e) { console.log(`  FAIL auth-orders: ${e.message.slice(0, 60)}`); }

    // 3. Profile (authenticated)
    try {
      await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'auth-profile', vp);
    } catch (e) { console.log(`  FAIL auth-profile: ${e.message.slice(0, 60)}`); }

    // 4. Admin dashboard
    try {
      await page.goto(`${BASE}/admin-dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      await screenshot(page, 'auth-admin', vp);
    } catch (e) { console.log(`  FAIL auth-admin: ${e.message.slice(0, 60)}`); }

    // 5. BookReader — find first book ID from catalog API
    try {
      const resp = await page.evaluate(async (api) => {
        const r = await fetch(`${api}/api/books/`);
        const data = await r.json();
        const books = data.results || data;
        return books.length > 0 ? books[0].id : null;
      }, API);

      if (resp) {
        await page.goto(`${BASE}/books/${resp}/read`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await screenshot(page, 'auth-bookreader', vp);
      } else {
        console.log('  SKIP bookreader: no books found in API');
      }
    } catch (e) { console.log(`  FAIL auth-bookreader: ${e.message.slice(0, 80)}`); }

    // 6. Checkout — add item to cart then navigate
    try {
      await page.goto(`${BASE}/catalog`, { waitUntil: 'networkidle', timeout: 15000 });
      const addBtn = await page.$('.tn-book-card__cart-btn, .tn-book-card button');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(800);
      }
      await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'auth-checkout', vp);
    } catch (e) { console.log(`  FAIL auth-checkout: ${e.message.slice(0, 60)}`); }

    await page.close();
    await ctx.close();
  }

  await browser.close();
  console.log(`\nDone — auth snapshots in ${outDir}\n`);
}

run().catch(console.error);
