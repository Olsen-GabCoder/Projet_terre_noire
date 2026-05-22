/**
 * P2.2 — TnButton component tests via Playwright
 * Tests: rendering, variants, loading, disabled, icons, accessibility
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/dev/buttons';
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.log(`  FAIL: ${label}`); }
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Base rendering
  console.log('\n=== a) Base rendering ===');
  const firstBtn = page.locator('.tn-btn').first();
  const classes = await firstBtn.getAttribute('class');
  assert(classes.includes('tn-btn'), 'has tn-btn class');
  assert(classes.includes('tn-btn--primary'), 'has tn-btn--primary class');
  const btnType = await firstBtn.getAttribute('type');
  assert(btnType === 'button', 'type="button"');

  // b) All 7 variants rendered
  console.log('\n=== b) Variants ===');
  for (const v of ['primary', 'secondary', 'dark', 'outline', 'ghost', 'danger']) {
    const count = await page.locator(`.tn-btn--${v}`).count();
    assert(count > 0, `variant --${v} rendered (${count} instances)`);
  }
  const olCount = await page.locator('.tn-btn--outline-light').count();
  assert(olCount > 0, `variant --outline-light rendered (${olCount} instances)`);

  // c) Loading state
  console.log('\n=== c) Loading ===');
  const loadingBtn = page.locator('[aria-busy="true"]').first();
  const hasAriaBusy = await loadingBtn.getAttribute('aria-busy');
  assert(hasAriaBusy === 'true', 'aria-busy="true"');
  const spinnerCount = await loadingBtn.locator('.tn-btn__spinner').count();
  assert(spinnerCount === 1, 'spinner present');

  // d) Disabled state
  console.log('\n=== d) Disabled ===');
  const disabledBtn = page.locator('.tn-btn:disabled').first();
  const isDisabled = await disabledBtn.isDisabled();
  assert(isDisabled, 'button is disabled');
  const disabledBg = await disabledBtn.evaluate(el => getComputedStyle(el).backgroundColor);
  assert(disabledBg.includes('229') || disabledBg.includes('226') || disabledBg.includes('218'), `disabled bg is gray (${disabledBg})`);

  // e) Icons
  console.log('\n=== e) Icons ===');
  const iconBtn = page.locator('.tn-btn:has(.fas.fa-cart-plus)').first();
  const iconCount = await iconBtn.count();
  assert(iconCount > 0, 'button with left icon found');
  if (iconCount > 0) {
    const ariaHidden = await iconBtn.locator('[aria-hidden="true"]').count();
    assert(ariaHidden > 0, 'icon wrapper has aria-hidden="true"');
  }

  // f) Click behavior
  console.log('\n=== f) Click behavior ===');
  // Check the click log section — click "Normal" button
  const normalBtn = page.locator('text=Normal (doit logger)');
  await normalBtn.click();
  await page.waitForTimeout(200);
  const logContent = await page.locator('text=click: test normal').count();
  assert(logContent > 0, 'normal click logged');

  // Click disabled — should NOT add to log
  const disabledTest = page.locator('text=Disabled (ne doit PAS logger)');
  await disabledTest.click({ force: true });
  await page.waitForTimeout(200);
  const bugLog = await page.locator('text=BUG:').count();
  assert(bugLog === 0, 'disabled/loading clicks did NOT trigger onClick');

  // g) Accessibility — focus via Tab
  console.log('\n=== g) Focus-visible ===');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focusedClass = await page.evaluate(() => document.activeElement?.className || '');
  assert(focusedClass.includes('tn-btn'), 'Tab focuses a .tn-btn element');

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
