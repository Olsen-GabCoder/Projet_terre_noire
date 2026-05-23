/**
 * P8 — TnTextarea leftIcon tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 6000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Textareas rendered
  console.log('\n=== a) Rendering ===');
  const textareas = page.locator('textarea.tn-input');
  const count = await textareas.count();
  assert(count >= 4, `${count} textareas rendered (expected >= 4)`);

  // b) leftIcon rendered with --top modifier
  console.log('\n=== b) leftIcon with --top ===');
  const iconsTop = page.locator('.tn-field__icon--top');
  const iconTopCount = await iconsTop.count();
  assert(iconTopCount >= 3, `${iconTopCount} icons with --top modifier (expected >= 3)`);

  // c) Wrap has-left applied when leftIcon present
  console.log('\n=== c) Wrap --has-left ===');
  const wrapsWithLeft = page.locator('.tn-field__wrap--has-left').filter({ has: page.locator('textarea') });
  const wrapCount = await wrapsWithLeft.count();
  assert(wrapCount >= 3, `${wrapCount} textarea wraps with --has-left (expected >= 3)`);

  // d) Textarea without leftIcon has no wrap
  console.log('\n=== d) Retrocompat (no leftIcon) ===');
  const firstField = page.locator('.tn-field').filter({ has: page.locator('textarea') }).first();
  const hasWrap = await firstField.locator('.tn-field__wrap').count();
  assert(hasWrap === 0, 'first textarea (no leftIcon) has no wrap div');

  // e) Icon positioned at top (not centered)
  console.log('\n=== e) Icon top positioning ===');
  const firstIconTop = iconsTop.first();
  const transform = await firstIconTop.evaluate(el => getComputedStyle(el).transform);
  assert(transform === 'none', `icon transform = "${transform}" (expected none)`);

  // f) Error rendering
  console.log('\n=== f) Error ===');
  const errors = page.locator('.tn-field__error');
  const errorInTextareaSection = errors.last();
  const errorText = await errorInTextareaSection.textContent();
  assert(errorText.includes('50'), `error text contains "50": "${errorText}"`);

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
