/**
 * P5 — TnCheckbox component tests via Playwright
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
  const checkboxes = page.locator('.tn-checkbox');
  const count = await checkboxes.count();
  assert(count >= 7, `${count} .tn-checkbox elements rendered`);

  // b) Label
  console.log('\n=== b) Label ===');
  const labels = page.locator('.tn-checkbox__label');
  assert(await labels.count() >= 7, 'labels rendered');

  // c) Click toggle
  console.log('\n=== c) Click toggle ===');
  const firstCheckbox = page.locator('.tn-checkbox').first();
  const firstInput = firstCheckbox.locator('.tn-checkbox__input');
  const checkedBefore = await firstInput.isChecked();
  await firstCheckbox.click();
  await page.waitForTimeout(200);
  const checkedAfter = await firstInput.isChecked();
  assert(checkedBefore !== checkedAfter, `toggle: ${checkedBefore} -> ${checkedAfter}`);

  // d) Checked visual
  console.log('\n=== d) Checked visual ===');
  const checkedBox = page.locator('.tn-checkbox__input:checked + .tn-checkbox__box').first();
  if (await checkedBox.count() > 0) {
    const bg = await checkedBox.evaluate(el => getComputedStyle(el).backgroundColor);
    assert(bg.includes('232') || bg.includes('201'), `checked bg is orange/orange-hover (${bg})`);
    const checkScale = await checkedBox.locator('.tn-checkbox__check').evaluate(el => getComputedStyle(el).transform);
    assert(!checkScale.includes('scale(0)') && checkScale !== 'none', `checkmark visible (${checkScale})`);
  }

  // e) Disabled
  console.log('\n=== e) Disabled ===');
  const disabledCount = await page.locator('.tn-checkbox--disabled').count();
  assert(disabledCount >= 2, `disabled checkboxes found (${disabledCount})`);
  const disabledInput = page.locator('.tn-checkbox--disabled .tn-checkbox__input').first();
  assert(await disabledInput.isDisabled(), 'disabled input is truly disabled');

  // f) Error
  console.log('\n=== f) Error ===');
  const errorCount = await page.locator('.tn-checkbox--error').count();
  assert(errorCount >= 1, `error checkbox found (${errorCount})`);
  const errorMsg = page.locator('.tn-checkbox__error[role="alert"]').first();
  assert(await errorMsg.count() > 0, 'error message with role="alert"');

  // g) Required
  console.log('\n=== g) Required ===');
  const reqLabel = page.locator('.tn-checkbox__label--required').first();
  assert(await reqLabel.count() > 0, 'required label with * found');

  // h) Helper
  console.log('\n=== h) Helper ===');
  const helper = page.locator('.tn-checkbox__helper').first();
  assert(await helper.count() > 0, 'helper text rendered');

  // i) Focus-visible
  console.log('\n=== i) Focus-visible ===');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.type);
  assert(focused === 'checkbox', `tab focuses checkbox input (type: ${focused})`);

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
