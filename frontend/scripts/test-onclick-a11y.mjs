import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  console.log('=== P4.4 Keyboard Accessibility Tests ===\n');

  // Test 1: FAQ accordion
  console.log('  --- FAQ Accordion ---');
  const faqPage = await ctx.newPage();
  await faqPage.goto(`${BASE}/faq`, { waitUntil: 'networkidle', timeout: 20000 });
  await faqPage.waitForTimeout(1500);

  // Tab to the first FAQ item header (skip nav links first)
  for (let i = 0; i < 15; i++) {
    await faqPage.keyboard.press('Tab');
    await faqPage.waitForTimeout(100);
  }

  // Check if we reached a FAQ button
  const faqFocus = await faqPage.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName?.toLowerCase(),
      cls: el?.className?.toString()?.slice(0, 50),
      ariaExpanded: el?.getAttribute('aria-expanded'),
      ariaControls: el?.getAttribute('aria-controls'),
      role: el?.getAttribute('role') || el?.tagName?.toLowerCase(),
    };
  });
  console.log(`    Focused: <${faqFocus.tag}> .${faqFocus.cls}`);
  console.log(`    aria-expanded=${faqFocus.ariaExpanded}, aria-controls=${faqFocus.ariaControls}`);

  // Try to find and focus a faq-item__header button directly
  const faqBtn = await faqPage.$('button.faq-item__header');
  if (faqBtn) {
    await faqBtn.focus();
    const beforeOpen = await faqPage.evaluate(() => {
      const item = document.querySelector('.faq-item');
      return item?.classList?.contains('faq-item--open');
    });

    // Press Enter to toggle
    await faqPage.keyboard.press('Enter');
    await faqPage.waitForTimeout(500);

    const afterOpen = await faqPage.evaluate(() => {
      const item = document.querySelector('.faq-item');
      return item?.classList?.contains('faq-item--open');
    });

    console.log(`    Before Enter: open=${beforeOpen}`);
    console.log(`    After Enter: open=${afterOpen}`);
    console.log(`    Toggle works: ${beforeOpen !== afterOpen ? 'YES' : 'NO'}`);

    // Check aria-expanded updated
    const expandedAfter = await faqPage.evaluate(() => {
      return document.querySelector('button.faq-item__header')?.getAttribute('aria-expanded');
    });
    console.log(`    aria-expanded after toggle: ${expandedAfter}`);
  } else {
    console.log('    FAIL: No button.faq-item__header found');
  }
  await faqPage.close();

  // Test 2: Catalog filters backdrop (mobile)
  console.log('\n  --- Catalog Filters Backdrop (mobile) ---');
  const catCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
  });
  const catPage = await catCtx.newPage();
  await catPage.goto(`${BASE}/catalog`, { waitUntil: 'networkidle', timeout: 20000 });
  await catPage.waitForTimeout(1500);

  // Open filters via click
  const filterBtn = await catPage.$('.cat-filters__mobile-btn');
  if (filterBtn) {
    await filterBtn.click();
    await catPage.waitForTimeout(500);

    const backdrop = await catPage.$('.cat-filters__backdrop');
    if (backdrop) {
      const attrs = await catPage.evaluate(() => {
        const el = document.querySelector('.cat-filters__backdrop');
        return {
          role: el?.getAttribute('role'),
          tabIndex: el?.getAttribute('tabindex'),
          ariaLabel: el?.getAttribute('aria-label'),
          hasKeyDown: !!el?.onkeydown || el?.getAttribute('onkeydown') !== null,
        };
      });
      console.log(`    role=${attrs.role}, tabIndex=${attrs.tabIndex}, aria-label="${attrs.ariaLabel}"`);
      console.log(`    Accessible: ${attrs.role === 'button' && attrs.tabIndex === '0' ? 'YES' : 'NO'}`);
    }
  } else {
    console.log('    SKIP: No mobile filter button (viewport may be too wide)');
  }
  await catPage.close();
  await catCtx.close();

  await ctx.close();
  await browser.close();
  console.log('\nDone.');
}

run().catch(console.error);
