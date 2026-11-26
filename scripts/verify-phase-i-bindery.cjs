/**
 * scripts/verify-phase-i-bindery.cjs
 * Visual validation for Phase I: Broadside Bindery & Physical Artifacts (Features 36-42).
 */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1500, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return false;
}

async function run() {
  console.log('=== Phase I Visual Verification: Broadside Bindery & Physical Artifacts ===');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/time');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/time');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await desktopContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2500);

    try {
      const dismissBtn = await desktopPage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await desktopPage.waitForTimeout(400);
      } else {
        await desktopPage.keyboard.press('Escape');
      }
    } catch {}

    // -------------------------------------------------------------
    // Test 1: Rubber Stamp & Redactor Studio (#37) with live stamp click
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Rubber Stamp & Redactor Studio (#37) ---');
    const stampsBtn = await desktopPage.$('#btn-bindery-stamps');
    if (stampsBtn) {
      await stampsBtn.click();
    } else {
      await desktopPage.keyboard.press('y');
    }
    await desktopPage.waitForSelector('#stamp-redactor-proof-canvas', { timeout: 8000 });
    await desktopPage.waitForTimeout(300);

    const canvas = await desktopPage.$('#stamp-redactor-proof-canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      if (box) {
        await desktopPage.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.35);
        await desktopPage.waitForTimeout(350);
      }
    }

    const shot1 = path.join(ARTIFACTS_DIR, 'ui-phase-i-1-stamps-redactor.png');
    await desktopPage.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // -------------------------------------------------------------
    // Test 2: Masthead Typography Studio (#39)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Masthead Typography Studio (#39) ---');
    const mastheadTab = desktopPage.locator('nav[aria-label="Bindery Desks"] button:has-text("#39 Masthead Studio")');
    if (await mastheadTab.count() > 0) {
      await mastheadTab.first().click({ force: true });
      await desktopPage.waitForTimeout(900);
    }

    const shot2 = path.join(ARTIFACTS_DIR, 'ui-phase-i-2-masthead-studio.png');
    await desktopPage.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    // -------------------------------------------------------------
    // Test 3: Ex-Libris Bookplate Engraver (#41)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Ex-Libris Bookplate Engraver (#41) ---');
    const bookplateTab = desktopPage.locator('nav[aria-label="Bindery Desks"] button:has-text("#41 Ex-Libris Plate")');
    if (await bookplateTab.count() > 0) {
      await bookplateTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1200);
    }

    const shot3 = path.join(ARTIFACTS_DIR, 'ui-phase-i-3-exlibris-bookplate.png');
    await desktopPage.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    // -------------------------------------------------------------
    // Test 4: Daily Cryptic Crossword (#42)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Daily Cryptic Crossword (#42) ---');
    const crosswordTab = desktopPage.locator('nav[aria-label="Bindery Desks"] button:has-text("#42 Cryptic Crossword")');
    if (await crosswordTab.count() > 0) {
      await crosswordTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1200);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-phase-i-4-cryptic-crossword.png');
    await desktopPage.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(400);
    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 5: Mobile Portrait Viewport (390x844) & Bindery Desk
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Mobile Viewport (Portrait 390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await mobilePage.waitForTimeout(2500);

    try {
      const dismissBtn = await mobilePage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await mobilePage.waitForTimeout(400);
      } else {
        await mobilePage.keyboard.press('Escape');
      }
    } catch {}

    const mobileBinderyBtn = await mobilePage.$('#btn-bindery-crossword');
    if (mobileBinderyBtn) {
      await mobileBinderyBtn.click();
      await mobilePage.waitForTimeout(1200);
    } else {
      await mobilePage.keyboard.press('y');
      await mobilePage.waitForTimeout(1200);
    }

    const shot5 = path.join(ARTIFACTS_DIR, 'ui-phase-i-5-mobile-bindery-desk.png');
    await mobilePage.screenshot({ path: shot5 });
    console.log(`Saved screenshot 5: ${shot5}`);

    await mobileContext.close();
    console.log('\n=== All Phase I Visual Validation Screenshots Captured Successfully! ===');
  } catch (err) {
    console.error('Visual verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
