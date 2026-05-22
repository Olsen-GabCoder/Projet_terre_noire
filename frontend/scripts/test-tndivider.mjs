/**
 * P4 — TnDivider component tests via Playwright
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/dev/atomics-2-5';
let passed = 0, failed = 0;

function assert(condition, label) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.log(`  FAIL: ${label}`); }
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 3000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Rendering
  console.log('\n=== a) Rendering ===');
  const dividers = page.locator('.tn-divider');
  const count = await dividers.count();
  assert(count > 10, `${count} .tn-divider elements rendered`);

  // b) role="separator"
  console.log('\n=== b) Accessibility ===');
  const role = await dividers.first().getAttribute('role');
  assert(role === 'separator', `role="${role}"`);
  const orientation = await dividers.first().getAttribute('aria-orientation');
  assert(orientation === 'horizontal', `aria-orientation="${orientation}"`);

  // c) Variants
  console.log('\n=== c) Variants ===');
  for (const v of ['thick', 'dashed', 'gradient', 'ornament', 'warm']) {
    const vCount = await page.locator(`.tn-divider--${v}`).count();
    assert(vCount > 0, `variant --${v} rendered (${vCount})`);
  }

  // d) Ornament SVG
  console.log('\n=== d) Ornament ===');
  const ornamentSvg = page.locator('.tn-divider--ornament .tn-divider__ornament');
  assert(await ornamentSvg.count() > 0, 'ornament SVG present');

  // e) Label
  console.log('\n=== e) Label ===');
  const labels = page.locator('.tn-divider__label');
  assert(await labels.count() > 0, 'labels rendered');
  const labelText = await labels.first().textContent();
  assert(labelText.trim().length > 0, `label text: "${labelText.trim()}"`);

  // f) Spacings
  console.log('\n=== f) Spacings ===');
  for (const s of ['sm', 'md', 'lg']) {
    const sCount = await page.locator(`.tn-divider--${s}`).count();
    assert(sCount > 0, `spacing --${s} rendered (${sCount})`);
  }

  // g) Dark
  console.log('\n=== g) Dark ===');
  const darkCount = await page.locator('.tn-divider--dark').count();
  assert(darkCount > 0, `dark mode rendered (${darkCount})`);

  // h) Line element
  console.log('\n=== h) Line structure ===');
  const lines = page.locator('.tn-divider__line');
  assert(await lines.count() > 10, `${await lines.count()} __line elements`);

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
