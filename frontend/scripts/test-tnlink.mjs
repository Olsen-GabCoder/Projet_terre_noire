/**
 * P1 — TnLink component tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Default variant renders
  console.log('\n=== a) Default variant ===');
  const defaultLinks = page.locator('.tn-link:not([class*="--"])');
  const allLinks = page.locator('.tn-link');
  const totalCount = await allLinks.count();
  assert(totalCount > 10, `${totalCount} .tn-link elements rendered`);

  // b) All variants present
  console.log('\n=== b) Variants ===');
  for (const v of ['muted', 'strong', 'ghost', 'on-dark']) {
    const count = await page.locator(`.tn-link--${v}`).count();
    assert(count > 0, `variant --${v} rendered (${count})`);
  }

  // c) External auto-detection
  console.log('\n=== c) External ===');
  const extLinks = page.locator('.tn-link--external');
  const extCount = await extLinks.count();
  assert(extCount > 0, `external links detected (${extCount})`);
  if (extCount > 0) {
    const target = await extLinks.first().getAttribute('target');
    const rel = await extLinks.first().getAttribute('rel');
    assert(target === '_blank', `target="_blank" on external`);
    assert(rel && rel.includes('noopener'), `rel="noopener noreferrer"`);
  }

  // d) Internal links use React Router (no target=_blank)
  console.log('\n=== d) Internal routing ===');
  const internalLink = page.locator('.tn-link:not(.tn-link--external)').first();
  const internalTarget = await internalLink.getAttribute('target');
  assert(!internalTarget, `internal link has no target (got: ${internalTarget})`);
  const internalHref = await internalLink.getAttribute('href');
  assert(internalHref && internalHref.startsWith('/'), `internal link has relative href: ${internalHref}`);

  // e) Icon slots
  console.log('\n=== e) Icons ===');
  const iconLeft = page.locator('.tn-link__icon').first();
  assert(await iconLeft.count() > 0, 'left icon slot found');
  const ariaHidden = await iconLeft.getAttribute('aria-hidden');
  assert(ariaHidden === 'true', 'icon has aria-hidden="true"');
  const iconRight = page.locator('.tn-link__icon--right').first();
  assert(await iconRight.count() > 0, 'right icon slot found');

  // f) Underline animation
  console.log('\n=== f) Underline animation ===');
  const testLink = page.locator('.tn-link').first();
  const bgBefore = await testLink.evaluate(el => getComputedStyle(el).backgroundSize);
  assert(bgBefore.includes('0%'), `before hover: bgSize starts at 0% (${bgBefore})`);
  await testLink.hover();
  await page.waitForTimeout(300);
  const bgAfter = await testLink.evaluate(el => getComputedStyle(el).backgroundSize);
  assert(bgAfter.includes('100%'), `after hover: bgSize = 100% (${bgAfter})`);

  // g) On-dark section exists
  console.log('\n=== g) On-dark ===');
  const onDarkCount = await page.locator('.tn-link--on-dark').count();
  assert(onDarkCount > 0, `on-dark links rendered (${onDarkCount})`);

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
