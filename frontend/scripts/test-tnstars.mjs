/**
 * P3 — TnStars component tests via Playwright
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 2000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // a) Rendering
  console.log('\n=== a) Rendering ===');
  const starsGroups = page.locator('.tn-stars');
  const count = await starsGroups.count();
  assert(count > 10, `${count} .tn-stars elements rendered`);

  // b) Full stars (value=5 → 5 fas fa-star)
  console.log('\n=== b) Full stars ===');
  // Find a 5/5 star group
  const fullStars = page.locator('.tn-stars .fas.fa-star');
  assert(await fullStars.count() > 20, `${await fullStars.count()} full stars across all groups`);

  // c) Half star
  console.log('\n=== c) Half star ===');
  const halfStars = page.locator('.tn-stars .fas.fa-star-half-stroke');
  assert(await halfStars.count() > 0, `half stars present (${await halfStars.count()})`);

  // d) Empty stars (opacity 0.3)
  console.log('\n=== d) Empty stars ===');
  const emptyStars = page.locator('.tn-stars__star--empty').first();
  if (await emptyStars.count() > 0) {
    const opacity = await emptyStars.evaluate(el => getComputedStyle(el).opacity);
    assert(opacity === '0.3', `empty star opacity = ${opacity}`);
  } else {
    // Check .far stars
    const farStars = page.locator('.tn-stars .far').first();
    if (await farStars.count() > 0) {
      const opacity = await farStars.evaluate(el => getComputedStyle(el).opacity);
      assert(opacity === '0.3', `empty .far star opacity = ${opacity}`);
    } else {
      assert(false, 'no empty stars found');
    }
  }

  // e) Sizes
  console.log('\n=== e) Sizes ===');
  for (const s of ['xs', 'md', 'lg']) {
    const sizeCount = await page.locator(`.tn-stars--${s}`).count();
    assert(sizeCount > 0, `size --${s} rendered (${sizeCount})`);
  }

  // f) Count/meta
  console.log('\n=== f) Count meta ===');
  const countMeta = page.locator('.tn-stars__count');
  assert(await countMeta.count() > 0, 'count meta rendered');
  const countText = await countMeta.first().textContent();
  assert(countText.includes('avis'), `count contains "avis" ("${countText.trim()}")`);

  // g) showValue
  console.log('\n=== g) showValue ===');
  const valueEls = page.locator('.tn-stars__value');
  assert(await valueEls.count() > 0, 'value displayed');

  // h) Compact
  console.log('\n=== h) Compact ===');
  const compacts = page.locator('.tn-stars--compact');
  assert(await compacts.count() > 0, `compact variant rendered (${await compacts.count()})`);

  // i) Interactive
  console.log('\n=== i) Interactive ===');
  const interactiveGroup = page.locator('.tn-stars--interactive').first();
  assert(await interactiveGroup.count() > 0, 'interactive stars rendered');
  const role = await interactiveGroup.getAttribute('role');
  assert(role === 'radiogroup', `role = "${role}"`);
  // Click 3rd star
  const starBtns = interactiveGroup.locator('button');
  if (await starBtns.count() >= 3) {
    await starBtns.nth(2).click();
    await page.waitForTimeout(200);
    const output = await page.locator('text=Votre note : 3/5').count();
    assert(output > 0, 'click on 3rd star → onChange(3) works');
  }

  // j) aria-label
  console.log('\n=== j) Accessibility ===');
  const ariaLabel = await starsGroups.first().getAttribute('aria-label');
  assert(ariaLabel && ariaLabel.includes('sur'), `aria-label present: "${ariaLabel}"`);
  const readOnlyRole = await page.locator('.tn-stars:not(.tn-stars--interactive):not(.tn-stars--compact)').first().getAttribute('role');
  assert(readOnlyRole === 'img', `read-only role = "${readOnlyRole}"`);

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
