/**
 * Capture BEFORE/AFTER snapshots for --ds-warning token change impact
 * Usage: node scripts/capture-warning-impact.mjs [before|after]
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../../backend/.env'), 'utf-8');
const email = env.match(/CREATE_ADMIN_EMAIL=(.+)/)?.[1]?.trim();
const password = env.match(/CREATE_ADMIN_PASSWORD=(.+)/)?.[1]?.trim();

const phase = process.argv[2] || 'before';
const BASE = 'http://localhost:5173';
const outDir = `../docs/audit-premium/VAGUE3/snapshots-warning-${phase}`;

const ADMIN_PAGES = [
  { name: 'admin-dashboard',   path: '/admin-dashboard' },
  { name: 'admin-manuscripts', path: '/admin-dashboard/manuscripts' },
  { name: 'admin-orders',      path: '/admin-dashboard/orders' },
  { name: 'admin-users',       path: '/admin-dashboard/users' },
];

async function run() {
  console.log(`\n=== Capture ${phase.toUpperCase()} ===\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Logged in, current URL:', page.url());

  // Capture each admin page
  for (const { name, path } of ADMIN_PAGES) {
    console.log(`Capturing ${name}...`);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${outDir}/${name}.png`,
      fullPage: true,
    });
    console.log(`  -> ${outDir}/${name}.png`);
  }

  await browser.close();
  console.log(`\nDone! ${ADMIN_PAGES.length} captures saved to ${outDir}/\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
