/**
 * P4.4 — Test clavier empirique des 4 div onClick
 * Verifie : Tab atteint l'element + Enter declenche l'action
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const results = [];

  // ─── TEST 1 : Catalog filters backdrop ───
  try {
    await page.goto(`${BASE}/catalogue`, { waitUntil: 'networkidle' });
    // Open filters drawer (mobile button)
    const filterBtn = page.locator('.cat-filters__mobile-btn');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(400);
      // Tab to backdrop
      const backdrop = page.locator('.cat-filters__backdrop');
      await backdrop.focus();
      const focused = await page.evaluate(() => document.activeElement?.className);
      const hasRole = await backdrop.getAttribute('role');
      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const stillVisible = await backdrop.isVisible();
      results.push({
        test: 'Catalog filters backdrop',
        focused: focused?.includes('backdrop'),
        role: hasRole,
        enterClosedIt: !stillVisible
      });
    } else {
      results.push({ test: 'Catalog filters backdrop', skip: 'Not visible (desktop viewport?)' });
    }
  } catch (e) {
    results.push({ test: 'Catalog filters backdrop', error: e.message });
  }

  // ─── TEST 2 : FAQ accordion ───
  try {
    await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const faqBtn = page.locator('.faq-item__header').first();
    await faqBtn.focus();
    const focused2 = await page.evaluate(() => document.activeElement?.className);
    const ariaExp = await faqBtn.getAttribute('aria-expanded');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const ariaExpAfter = await faqBtn.getAttribute('aria-expanded');
    results.push({
      test: 'FAQ accordion',
      focused: focused2?.includes('faq-item__header'),
      ariaExpandedBefore: ariaExp,
      ariaExpandedAfter: ariaExpAfter,
      enterToggled: ariaExp !== ariaExpAfter
    });
  } catch (e) {
    results.push({ test: 'FAQ accordion', error: e.message });
  }

  // ─── TEST 3 : Admin drawer overlay ───
  try {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Need to be logged in as admin — try clicking mobile bar
    const mobBar = page.locator('.adm-mob-bar');
    if (await mobBar.isVisible()) {
      await mobBar.click();
      await page.waitForTimeout(400);
      const overlay = page.locator('.adm-drawer-overlay');
      if (await overlay.isVisible()) {
        await overlay.focus();
        const focused3 = await page.evaluate(() => document.activeElement?.className);
        const hasRole3 = await overlay.getAttribute('role');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        const stillVisible3 = await overlay.isVisible();
        results.push({
          test: 'Admin drawer overlay',
          focused: focused3?.includes('overlay'),
          role: hasRole3,
          enterClosedIt: !stillVisible3
        });
      } else {
        results.push({ test: 'Admin drawer overlay', skip: 'Overlay not visible after click' });
      }
    } else {
      results.push({ test: 'Admin drawer overlay', skip: 'Not on admin (auth required or desktop)' });
    }
  } catch (e) {
    results.push({ test: 'Admin drawer overlay', error: e.message });
  }

  // ─── TEST 4 : Footer dev-modal overlay ───
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Dev modal trigger — look for dev signature link in footer
    const devTrigger = page.locator('.ft-dev-trigger, .ft-dev-sig, [data-dev-modal]').first();
    if (await devTrigger.isVisible()) {
      await devTrigger.click();
      await page.waitForTimeout(400);
      const overlay = page.locator('.dev-modal-overlay');
      if (await overlay.isVisible()) {
        await overlay.focus();
        const focused4 = await page.evaluate(() => document.activeElement?.className);
        const hasRole4 = await overlay.getAttribute('role');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        const stillVisible4 = await overlay.isVisible();
        results.push({
          test: 'Footer dev-modal overlay',
          focused: focused4?.includes('overlay'),
          role: hasRole4,
          enterClosedIt: !stillVisible4
        });
      } else {
        results.push({ test: 'Footer dev-modal overlay', skip: 'Overlay not visible' });
      }
    } else {
      results.push({ test: 'Footer dev-modal overlay', skip: 'Dev trigger not found' });
    }
  } catch (e) {
    results.push({ test: 'Footer dev-modal overlay', error: e.message });
  }

  console.log('\n══════════ P4.4 KEYBOARD TEST RESULTS ══════════\n');
  results.forEach(r => console.log(JSON.stringify(r, null, 2)));
  console.log('\n════════════════════════════════════════════════\n');

  await browser.close();
}

test().catch(console.error);
