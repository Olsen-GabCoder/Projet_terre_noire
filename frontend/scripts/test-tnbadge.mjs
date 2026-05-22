/**
 * P2.4 — TnBadge component tests via Playwright
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/dev/badges';
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

  // a) All 8 variants rendered
  console.log('\n=== a) Variants ===');
  for (const v of ['promo', 'new', 'success', 'warning', 'danger', 'info', 'neutral']) {
    const count = await page.locator(`.tn-badge--${v}`).count();
    assert(count > 0, `variant --${v} rendered (${count})`);
  }
  const countBadges = await page.locator('.tn-badge--count').count();
  assert(countBadges > 0, `variant --count rendered (${countBadges})`);

  // b) Styles
  console.log('\n=== b) Styles ===');
  const softCount = await page.locator('.tn-badge--soft').count();
  assert(softCount > 0, `soft style rendered (${softCount})`);
  const outlineCount = await page.locator('.tn-badge--outline').count();
  assert(outlineCount > 0, `outline style rendered (${outlineCount})`);

  // c) Sizes
  console.log('\n=== c) Sizes ===');
  const xsCount = await page.locator('.tn-badge--xs').count();
  assert(xsCount > 0, `size xs rendered (${xsCount})`);
  const mdCount = await page.locator('.tn-badge--md').count();
  assert(mdCount > 0, `size md rendered (${mdCount})`);

  // d) Pill shape
  console.log('\n=== d) Pill ===');
  const pillCount = await page.locator('.tn-badge--pill').count();
  assert(pillCount > 0, `pill shape rendered (${pillCount})`);

  // e) Pop animation
  console.log('\n=== e) Pop animation ===');
  const popCount = await page.locator('.tn-badge--pop').count();
  assert(popCount > 0, `pop animation badges (${popCount})`);
  const popAnim = await page.locator('.tn-badge--pop').first().evaluate(
    el => getComputedStyle(el).animationName
  );
  assert(popAnim === 'tn-badge-pop', `animation name = ${popAnim}`);

  // f) Reduced-motion disables pop
  console.log('\n=== f) Reduced-motion ===');
  const context2 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const page2 = await context2.newPage();
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(500);
  const rmAnim = await page2.locator('.tn-badge--pop').first().evaluate(
    el => getComputedStyle(el).animationName
  );
  assert(rmAnim === 'none', `reduced-motion: animation = ${rmAnim}`);
  await page2.close();
  await context2.close();

  // g) Count prop renders number
  console.log('\n=== g) Count prop ===');
  const countText = await page.locator('.tn-badge--count').first().textContent();
  assert(/\d+/.test(countText.trim()), `count badge text is numeric: "${countText.trim()}"`);

  // h) Left icon with aria-hidden
  console.log('\n=== h) Icons ===');
  const iconBadge = await page.locator('.tn-badge:has(.fas)').first();
  assert(await iconBadge.count() > 0, 'badge with icon found');
  const ariaHidden = await iconBadge.locator('[aria-hidden="true"]').count();
  assert(ariaHidden > 0, 'icon has aria-hidden="true"');

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
