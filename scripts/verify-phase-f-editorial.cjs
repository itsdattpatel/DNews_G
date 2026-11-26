/**
 * scripts/verify-phase-f-editorial.cjs
 * Visual validation for Phase F: AI Editorial Intelligence, Socratic Analysis & Jargon Decoders (Features 11-20).
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
  console.log('=== Phase F Visual Verification: AI Editorial Intelligence & Socratic Suite ===');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/time');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/time');
    process.exit(1);
  }
  console.log('Backend active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Mode & Phase F Action Bar Buttons
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop Action Bar with Editorial Intelligence Buttons ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await desktopContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2500);

    // Dismiss Missed News Modal if shown
    try {
      const dismissBtn = await desktopPage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await desktopPage.waitForTimeout(400);
      } else {
        await desktopPage.keyboard.press('Escape');
      }
    } catch {}

    // Take screenshot 1: Desktop with new action bar buttons
    const shot1 = path.join(ARTIFACTS_DIR, 'ui-phase-f-1-desktop-actionbar.png');
    await desktopPage.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // -------------------------------------------------------------
    // Test 2: Devil's Advocate Counter-Brief Tab
    // -------------------------------------------------------------
    console.log('\n--- 2. Opening Editorial Intelligence Desk (Devil\'s Advocate Tab) ---');
    const devilsBtn = await desktopPage.$('#btn-devils-advocate');
    if (devilsBtn) {
      await devilsBtn.click();
      await desktopPage.waitForTimeout(1000);
    } else {
      await desktopPage.keyboard.press('e');
      await desktopPage.waitForTimeout(1000);
    }

    const shot2 = path.join(ARTIFACTS_DIR, 'ui-phase-f-2-devils-advocate.png');
    await desktopPage.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    // -------------------------------------------------------------
    // Test 3: History Rhymes Tab
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Historical Rhymes Tab ---');
    const rhymesTab = desktopPage.locator('nav[aria-label="Editorial Desks"] button:has-text("History Rhymes")');
    if (await rhymesTab.count() > 0) {
      await rhymesTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1200);
    }

    const shot3 = path.join(ARTIFACTS_DIR, 'ui-phase-f-3-historical-rhymes.png');
    await desktopPage.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    // -------------------------------------------------------------
    // Test 4: Socratic Tutor Tab
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing AI Socratic News Tutor Tab ---');
    const socraticTab = desktopPage.locator('nav[aria-label="Editorial Desks"] button:has-text("Socratic Tutor")');
    if (await socraticTab.count() > 0) {
      await socraticTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1200);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-phase-f-4-socratic-tutor.png');
    await desktopPage.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    // Close desktop dialog
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);
    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 5: Mobile Mode (Portrait) & Editorial Intelligence Desk
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

    // Dismiss Missed News Modal
    try {
      const dismissBtn = await mobilePage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await mobilePage.waitForTimeout(400);
      } else {
        await mobilePage.keyboard.press('Escape');
      }
    } catch {}

    // Open Editorial Intelligence Desk via keyboard or button
    const mobileDevilsBtn = await mobilePage.$('#btn-devils-advocate');
    if (mobileDevilsBtn) {
      await mobileDevilsBtn.click();
      await mobilePage.waitForTimeout(1000);
    } else {
      await mobilePage.keyboard.press('e');
      await mobilePage.waitForTimeout(1000);
    }

    const shot5 = path.join(ARTIFACTS_DIR, 'ui-phase-f-5-mobile-editorial-desk.png');
    await mobilePage.screenshot({ path: shot5 });
    console.log(`Saved screenshot 5: ${shot5}`);

    await mobileContext.close();
    console.log('\n=== All Phase F Visual Validation Screenshots Captured Successfully! ===');
  } catch (err) {
    console.error('Visual verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
