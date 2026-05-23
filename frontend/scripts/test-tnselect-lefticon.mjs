/**
 * P9 — TnSelect leftIcon tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 7000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Selects rendered
  console.log('\n=== a) Rendering ===');
  const selects = page.locator('select.tn-input');
  const count = await selects.count();
  assert(count >= 4, `${count} selects rendered (expected >= 4)`);

  // b) leftIcon rendered (centered, not --top)
  console.log('\n=== b) leftIcon present ===');
  const selectWraps = page.locator('.tn-field__wrap--has-left').filter({ has: page.locator('select') });
  const leftCount = await selectWraps.count();
  assert(leftCount >= 3, `${leftCount} selects with leftIcon (expected >= 3)`);

  // c) No --top modifier on select icons (centered vertical)
  console.log('\n=== c) No --top (centered) ===');
  const selectIcons = selectWraps.first().locator('.tn-field__icon--left');
  const hasTop = await selectIcons.first().evaluate(el => el.classList.contains('tn-field__icon--top'));
  assert(!hasTop, 'select leftIcon has no --top modifier (centered)');

  // d) Chevron preserved on all selects
  console.log('\n=== d) Chevron preserved ===');
  const chevrons = page.locator('.tn-field__wrap--has-right').filter({ has: page.locator('select') });
  const chevronCount = await chevrons.count();
  assert(chevronCount >= 4, `${chevronCount} selects with chevron right (expected >= 4)`);

  // e) Select without leftIcon — no --has-left
  console.log('\n=== e) Retrocompat (no leftIcon) ===');
  const firstSelectWrap = page.locator('.tn-field__wrap').filter({ has: page.locator('select') }).first();
  const hasLeft = await firstSelectWrap.evaluate(el => el.classList.contains('tn-field__wrap--has-left'));
  assert(!hasLeft, 'first select (no leftIcon) has no --has-left');

  // f) Error rendering
  console.log('\n=== f) Error ===');
  const errors = page.locator('.tn-field').filter({ has: page.locator('select') }).locator('.tn-field__error');
  const errCount = await errors.count();
  assert(errCount >= 1, `${errCount} select error(s) rendered`);

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
