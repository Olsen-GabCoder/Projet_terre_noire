import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../../docs/audit-premium/VAGUE1/snapshots-P4.2');
mkdirSync(outDir, { recursive: true });
const BASE = 'http://localhost:5173';

const pages = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'login', path: '/login' },
];

async function run() {
  const browser = await chromium.launch();

  // 1. Reduced-motion context
  const rmCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  console.log('=== REDUCED MOTION MODE ===\n');
  for (const pg of pages) {
    const page = await rmCtx.newPage();
    await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Check animation properties on decorative elements
    const animInfo = await page.evaluate(() => {
      const results = [];
      // Check elements that typically have animations
      const selectors = [
        '.home-hero', '.home-orb', '.home-triptych__float',
        '.abt-hero', '.ct-hero', '.home-authors-scroll',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const s = getComputedStyle(el);
          results.push({
            selector: sel,
            animDuration: s.animationDuration,
            animIterCount: s.animationIterationCount,
            transitionDuration: s.transitionDuration,
          });
        }
      }
      // Also check any element with animation
      const animated = document.querySelectorAll('[style*="animation"], .home-hero__bg');
      for (const el of Array.from(animated).slice(0, 3)) {
        const s = getComputedStyle(el);
        results.push({
          selector: el.className?.toString()?.slice(0, 40) || el.tagName,
          animDuration: s.animationDuration,
          animIterCount: s.animationIterationCount,
        });
      }
      return results;
    });

    console.log(`  ${pg.name}:`);
    for (const info of animInfo) {
      const disabled = info.animDuration === '0.01ms' || info.animDuration === '0s';
      console.log(`    ${disabled ? 'DISABLED' : 'ACTIVE '} | ${info.selector} | dur=${info.animDuration} iter=${info.animIterCount}`);
    }

    await page.screenshot({
      path: resolve(outDir, `${pg.name}--reduced-motion.png`),
      fullPage: true,
    });
    console.log(`    Screenshot: ${pg.name}--reduced-motion.png`);

    await page.close();
  }
  await rmCtx.close();

  // 2. Normal context (verify animations still work)
  console.log('\n=== NORMAL MODE (verify animations active) ===\n');
  const normalCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const normalPage = await normalCtx.newPage();
  await normalPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await normalPage.waitForTimeout(2000);

  const normalAnim = await normalPage.evaluate(() => {
    const el = document.querySelector('.home-hero') || document.querySelector('.home-hero__bg');
    if (!el) return { selector: 'not found', animDuration: 'N/A' };
    const s = getComputedStyle(el);
    return {
      selector: el.className?.toString()?.slice(0, 40),
      animDuration: s.animationDuration,
      animIterCount: s.animationIterationCount,
    };
  });
  console.log(`  home-hero: dur=${normalAnim.animDuration} iter=${normalAnim.animIterCount}`);
  const isActive = normalAnim.animDuration !== '0.01ms' && normalAnim.animDuration !== '0s';
  console.log(`  Status: ${isActive ? 'ACTIVE (correct)' : 'DISABLED (BUG!)'}`);

  await normalPage.screenshot({
    path: resolve(outDir, 'home--normal.png'),
    fullPage: true,
  });

  await normalPage.close();
  await normalCtx.close();
  await browser.close();
  console.log('\nDone.');
}

run().catch(console.error);
