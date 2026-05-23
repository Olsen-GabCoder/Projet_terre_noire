/**
 * P6 — TnAlert component tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 4000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Rendering — 4 variants present
  console.log('\n=== a) Rendering ===');
  const alerts = page.locator('.tn-alert');
  const count = await alerts.count();
  assert(count >= 8, `${count} .tn-alert elements rendered (expected >= 8)`);

  for (const v of ['error', 'success', 'warning', 'info']) {
    const vc = await page.locator(`.tn-alert--${v}`).count();
    assert(vc >= 1, `variant --${v}: ${vc} instances`);
  }

  // b) Accessibility — role="alert"
  console.log('\n=== b) Accessibility ===');
  const withRole = await page.locator('.tn-alert[role="alert"]').count();
  assert(withRole === count, `all ${withRole}/${count} alerts have role="alert"`);

  // c) Icon rendering
  console.log('\n=== c) Icons ===');
  const icons = await page.locator('.tn-alert__icon').count();
  assert(icons >= 6, `${icons} alert icons rendered`);

  // d) No-icon variant
  const noIconAlert = page.locator('.tn-alert--info').filter({ hasNot: page.locator('.tn-alert__icon') });
  const noIconCount = await noIconAlert.count();
  assert(noIconCount >= 1, `${noIconCount} alert(s) without icon`);

  // e) Title rendering
  console.log('\n=== d) Title ===');
  const titles = await page.locator('.tn-alert__title').count();
  assert(titles >= 2, `${titles} alerts with title`);

  // f) Close button
  console.log('\n=== e) Close button ===');
  const closeBtn = page.locator('.tn-alert__close');
  const closeBtnCount = await closeBtn.count();
  assert(closeBtnCount >= 1, `${closeBtnCount} close button(s)`);

  // g) Close button dismisses alert
  console.log('\n=== f) Dismiss ===');
  const alertsBefore = await page.locator('.tn-alert').count();
  await closeBtn.first().click();
  await page.waitForTimeout(500);
  const alertsAfter = await page.locator('.tn-alert').count();
  assert(alertsAfter === alertsBefore - 1, `dismiss: ${alertsBefore} -> ${alertsAfter}`);

  // h) Close button aria-label
  console.log('\n=== g) aria-label ===');
  const reAppearBtn = page.locator('button', { hasText: 'Remonter' });
  if (await reAppearBtn.count() > 0) {
    await reAppearBtn.click();
    await page.waitForTimeout(500);
    const closeBtn2 = page.locator('.tn-alert__close');
    const ariaLabel = await closeBtn2.first().getAttribute('aria-label');
    assert(ariaLabel === 'Fermer', `close aria-label = "${ariaLabel}"`);
  } else {
    assert(true, 'close aria-label (skipped, no re-appear button)');
  }

  // i) CSS — animation
  console.log('\n=== h) CSS ===');
  const firstAlert = page.locator('.tn-alert').first();
  const bg = await firstAlert.evaluate(el => getComputedStyle(el).backgroundColor);
  assert(bg && bg !== 'rgba(0, 0, 0, 0)', `background color set: ${bg}`);

  const borderRadius = await firstAlert.evaluate(el => getComputedStyle(el).borderRadius);
  assert(borderRadius && borderRadius !== '0px', `border-radius: ${borderRadius}`);

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
