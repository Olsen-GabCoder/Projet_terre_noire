/**
 * V4 A.0 — TnTooltip component tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 8000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Tooltip wraps rendered
  console.log('\n=== a) Rendering ===');
  const wraps = page.locator('.tn-tooltip-wrap');
  const wrapCount = await wraps.count();
  assert(wrapCount >= 7, `${wrapCount} tooltip wraps rendered (expected >= 7)`);

  // b) Tooltips hidden initially
  console.log('\n=== b) Hidden by default ===');
  const tooltips = page.locator('.tn-tooltip');
  const visibleCount = await page.locator('.tn-tooltip--visible').count();
  assert(visibleCount === 0, `${visibleCount} visible tooltips initially (expected 0)`);

  // c) Hover triggers visibility
  console.log('\n=== c) Hover trigger ===');
  const firstBtn = wraps.first().locator('button');
  await firstBtn.hover();
  await page.waitForTimeout(300); // delay 200ms + buffer
  const visibleAfterHover = await page.locator('.tn-tooltip--visible').count();
  assert(visibleAfterHover >= 1, `${visibleAfterHover} visible after hover (expected >= 1)`);

  // d) Mouseleave hides
  console.log('\n=== d) Mouseleave hides ===');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  const visibleAfterLeave = await page.locator('.tn-tooltip--visible').count();
  assert(visibleAfterLeave === 0, `${visibleAfterLeave} visible after leave (expected 0)`);

  // e) role="tooltip" present
  console.log('\n=== e) Accessibility ===');
  const roleTooltips = page.locator('[role="tooltip"]');
  const roleCount = await roleTooltips.count();
  assert(roleCount >= 6, `${roleCount} elements with role="tooltip" (expected >= 6)`);

  // f) Focus triggers visibility (a11y)
  console.log('\n=== f) Focus trigger ===');
  await firstBtn.focus();
  await page.waitForTimeout(300);
  const visibleAfterFocus = await page.locator('.tn-tooltip--visible').count();
  assert(visibleAfterFocus >= 1, `${visibleAfterFocus} visible after focus (expected >= 1)`);

  // g) Escape dismisses
  console.log('\n=== g) Escape dismiss ===');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const visibleAfterEscape = await page.locator('.tn-tooltip--visible').count();
  assert(visibleAfterEscape === 0, `${visibleAfterEscape} visible after Escape (expected 0)`);

  // h) Disabled tooltip does not render
  console.log('\n=== h) Disabled ===');
  const disabledWrap = page.locator('.tn-tooltip-wrap').filter({ has: page.locator('button', { hasText: 'Disabled' }) });
  const disabledTooltip = disabledWrap.locator('.tn-tooltip');
  assert(await disabledTooltip.count() === 0, 'disabled tooltip not rendered');

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
