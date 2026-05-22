/**
 * P2.3 — TnInput/TnTextarea/TnSelect tests via Playwright
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/dev/inputs';
let passed = 0, failed = 0;

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

  // a) TnInput renders with label + input
  console.log('\n=== a) TnInput rendering ===');
  const fields = page.locator('.tn-field');
  const fieldCount = await fields.count();
  assert(fieldCount > 10, `${fieldCount} .tn-field rendered`);
  const inputs = page.locator('.tn-input');
  assert(await inputs.count() > 10, 'multiple .tn-input elements');
  const labels = page.locator('.tn-field__label');
  assert(await labels.count() > 5, 'labels rendered');

  // b) Required label has *
  console.log('\n=== b) Required label ===');
  const reqLabel = page.locator('.tn-field__label--required').first();
  assert(await reqLabel.count() > 0, 'required label found');

  // c) Error state
  console.log('\n=== c) Error state ===');
  const errorInput = page.locator('.tn-input--error').first();
  assert(await errorInput.count() > 0, '.tn-input--error class present');
  const errorMsg = page.locator('.tn-field__error[role="alert"]').first();
  assert(await errorMsg.count() > 0, 'error message with role="alert"');
  const ariaInvalid = await errorInput.getAttribute('aria-invalid');
  assert(ariaInvalid === 'true', 'aria-invalid="true" on error input');

  // d) Disabled state
  console.log('\n=== d) Disabled state ===');
  const disInput = page.locator('.tn-input:disabled').first();
  assert(await disInput.count() > 0, 'disabled input found');
  const disBg = await disInput.evaluate(el => getComputedStyle(el).backgroundColor);
  assert(disBg.includes('241') || disBg.includes('238') || disBg.includes('230'), `disabled bg is gray (${disBg})`);

  // e) Focus warm glow
  console.log('\n=== e) Focus glow ===');
  const normalInput = page.locator('.tn-input:not(:disabled):not(.tn-input--error)').first();
  await normalInput.focus();
  await page.waitForTimeout(300);
  const focusShadow = await normalInput.evaluate(el => getComputedStyle(el).boxShadow);
  assert(focusShadow.includes('232, 96, 28') || focusShadow.includes('232,96,28'), `focus glow has orange (${focusShadow.substring(0, 60)}...)`);

  // f) Icon positioning
  console.log('\n=== f) Icons ===');
  const leftIcon = page.locator('.tn-field__icon--left').first();
  assert(await leftIcon.count() > 0, 'left icon found');
  const rightIcon = page.locator('.tn-field__icon--right').first();
  assert(await rightIcon.count() > 0, 'right icon found');

  // g) TnTextarea
  console.log('\n=== g) TnTextarea ===');
  const textareas = page.locator('textarea.tn-input');
  assert(await textareas.count() >= 3, `${await textareas.count()} textareas rendered`);

  // h) TnSelect
  console.log('\n=== h) TnSelect ===');
  const selects = page.locator('select.tn-input');
  assert(await selects.count() >= 2, `${await selects.count()} selects rendered`);
  const chevron = page.locator('.tn-field__wrap--has-right .fa-chevron-down').first();
  assert(await chevron.count() > 0, 'select has chevron icon');

  // i) Helper text
  console.log('\n=== i) Helper ===');
  const helper = page.locator('.tn-field__helper').first();
  assert(await helper.count() > 0, 'helper text rendered');

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
