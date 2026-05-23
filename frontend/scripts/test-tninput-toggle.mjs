/**
 * P7 — TnInput showToggle tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 5000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Toggle buttons rendered for showToggle inputs
  console.log('\n=== a) Toggle buttons rendered ===');
  const toggleBtns = page.locator('.tn-field__toggle');
  const toggleCount = await toggleBtns.count();
  assert(toggleCount >= 3, `${toggleCount} toggle buttons rendered (expected >= 3)`);

  // b) Initial input type is "password"
  console.log('\n=== b) Initial type ===');
  const firstToggleField = page.locator('.tn-field').filter({ has: page.locator('.tn-field__toggle') }).first();
  const firstInput = firstToggleField.locator('input.tn-input');
  const initialType = await firstInput.getAttribute('type');
  assert(initialType === 'password', `initial type = "${initialType}"`);

  // c) Click toggle → type becomes "text"
  console.log('\n=== c) Toggle to text ===');
  const firstToggle = firstToggleField.locator('.tn-field__toggle');
  await firstToggle.click();
  await page.waitForTimeout(200);
  const afterType = await firstInput.getAttribute('type');
  assert(afterType === 'text', `after click type = "${afterType}"`);

  // d) Click again → type back to "password"
  console.log('\n=== d) Toggle back to password ===');
  await firstToggle.click();
  await page.waitForTimeout(200);
  const backType = await firstInput.getAttribute('type');
  assert(backType === 'password', `after 2nd click type = "${backType}"`);

  // e) aria-label changes dynamically
  console.log('\n=== e) aria-label ===');
  const ariaHidden = await firstToggle.getAttribute('aria-label');
  assert(ariaHidden === 'Afficher le mot de passe', `hidden state: "${ariaHidden}"`);
  await firstToggle.click();
  await page.waitForTimeout(200);
  const ariaShown = await firstToggle.getAttribute('aria-label');
  assert(ariaShown === 'Masquer le mot de passe', `shown state: "${ariaShown}"`);
  await firstToggle.click(); // reset

  // f) Icon changes (fa-eye vs fa-eye-slash)
  console.log('\n=== f) Icon toggle ===');
  const iconHidden = firstToggle.locator('i');
  const hasEye = await iconHidden.evaluate(el => el.classList.contains('fa-eye'));
  assert(hasEye, 'hidden state shows fa-eye');
  await firstToggle.click();
  await page.waitForTimeout(200);
  const hasEyeSlash = await iconHidden.evaluate(el => el.classList.contains('fa-eye-slash'));
  assert(hasEyeSlash, 'shown state shows fa-eye-slash');
  await firstToggle.click(); // reset

  // g) No toggle for non-password inputs (rightIcon preserved)
  console.log('\n=== g) Retrocompat ===');
  const rightIcons = page.locator('.tn-field__icon--right');
  const rightIconCount = await rightIcons.count();
  assert(rightIconCount >= 1, `${rightIconCount} rightIcon span(s) preserved`);

  // h) No toggle on email/text inputs
  const emailField = page.locator('.tn-field').filter({ has: page.locator('input[type="email"]') }).first();
  const emailToggle = emailField.locator('.tn-field__toggle');
  assert(await emailToggle.count() === 0, 'no toggle on email input');

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
