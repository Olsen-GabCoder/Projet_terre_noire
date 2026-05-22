/**
 * P2 — TnPrice component tests via Playwright
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

  // a) Base rendering
  console.log('\n=== a) Base rendering ===');
  const prices = page.locator('.tn-price');
  const count = await prices.count();
  assert(count > 10, `${count} .tn-price elements rendered`);
  const firstText = await prices.first().textContent();
  assert(firstText.includes('15'), `contains "15" (got: "${firstText.trim()}")`);
  const hasFCFA = await page.locator('.tn-price__currency').count();
  assert(hasFCFA > 0, 'FCFA currency suffix present');

  // b) Promo — strike + discount
  console.log('\n=== b) Promo ===');
  const strikes = page.locator('.tn-price--strike');
  assert(await strikes.count() > 0, 'strike prices rendered');
  const discounts = page.locator('.tn-price__discount');
  assert(await discounts.count() > 0, 'discount badges rendered');
  const discountText = await discounts.first().textContent();
  assert(discountText.includes('-25%'), `discount text = "${discountText.trim()}"`);

  // c) Promo group
  console.log('\n=== c) Promo group ===');
  const groups = page.locator('.tn-price-group');
  assert(await groups.count() > 0, 'price groups rendered');
  const verticalGroups = page.locator('.tn-price-group--vertical');
  assert(await verticalGroups.count() > 0, 'vertical layout rendered');

  // d) Free
  console.log('\n=== d) Free ===');
  const freeEls = page.locator('.tn-price--free');
  assert(await freeEls.count() > 0, 'free variant rendered');
  const freeText = await freeEls.first().textContent();
  assert(freeText.trim() === 'Gratuit', `free text = "${freeText.trim()}"`);
  // No FCFA on free
  const freeCurrency = await freeEls.first().locator('.tn-price__currency').count();
  assert(freeCurrency === 0 || await freeEls.first().locator('.tn-price__currency').isHidden(), 'no FCFA on free');

  // e) Range
  console.log('\n=== e) Range ===');
  const rangeSep = page.locator('.tn-price__range-sep');
  assert(await rangeSep.count() > 0, 'range separator rendered');
  const rangeText = await rangeSep.first().textContent();
  assert(rangeText.includes('—'), `separator is "—" (got: "${rangeText}")`);

  // f) Sizes
  console.log('\n=== f) Sizes ===');
  for (const s of ['xs', 'sm', 'md', 'lg', 'xl']) {
    const sizeCount = await page.locator(`.tn-price--${s}`).count();
    assert(sizeCount > 0, `size --${s} rendered (${sizeCount})`);
  }

  // g) Muted
  console.log('\n=== g) Muted ===');
  const muted = page.locator('.tn-price--muted');
  assert(await muted.count() > 0, 'muted variant rendered');

  // h) Non-breaking space
  console.log('\n=== h) Locale formatting ===');
  const priceValue = await prices.first().evaluate(el => {
    // Get raw text of the value (not currency)
    const text = el.childNodes[0]?.textContent || '';
    return text.includes('\u00A0');
  });
  assert(priceValue, 'contains non-breaking space (\\u00A0)');

  console.log(`\n════════════════════════════════════`);
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`════════════════════════════════════\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error(e); process.exit(1); });
