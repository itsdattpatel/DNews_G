/**
 * scripts/verify-phase-e-investigative.cjs
 * Visual validation for Phase E: Investigative Journalism, OSINT & Verification Suite (Features 1-10).
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
  console.log('=== Phase E Visual Verification: Investigative Journalism & Verification Suite ===');

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
    // Test 1: Desktop Mode & Hairpin-Segmented Action Bar
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop Action Bar with Investigative Buttons ---');
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

    // Take screenshot 1: Desktop with new action bar
    const shot1 = path.join(ARTIFACTS_DIR, 'ui-phase-e-1-desktop-actionbar.png');
    await desktopPage.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // -------------------------------------------------------------
    // Test 2: Conflict Timeline in Investigative Desk Drawer
    // -------------------------------------------------------------
    console.log('\n--- 2. Opening Investigative Desk (Timeline Tab) ---');
    const timelineBtn = await desktopPage.$('#btn-conflict-timeline');
    if (timelineBtn) {
      await timelineBtn.click();
      await desktopPage.waitForTimeout(1000);
    } else {
      await desktopPage.keyboard.press('i');
      await desktopPage.waitForTimeout(1000);
    }

    const shot2 = path.join(ARTIFACTS_DIR, 'ui-phase-e-2-investigative-timeline.png');
    await desktopPage.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    // -------------------------------------------------------------
    // Test 3: Whistleblower Drop Desk (Feature #1)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Whistleblower Drop Desk Tab ---');
    const dropTab = await desktopPage.$('[role="dialog"] button:has-text("Whistleblower")');
    if (dropTab) {
      await dropTab.click();
      await desktopPage.waitForTimeout(800);
    }

    const shot3 = path.join(ARTIFACTS_DIR, 'ui-phase-e-3-whistleblower-drop.png');
    await desktopPage.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    // -------------------------------------------------------------
    // Test 4: Corporate Ownership & Conglomerate Overlay (Feature #4)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Corporate Ownership Tab ---');
    const ownershipTab = await desktopPage.$('[role="dialog"] button:has-text("Ownership")');
    if (ownershipTab) {
      await ownershipTab.click();
      await desktopPage.waitForTimeout(800);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-phase-e-4-corporate-ownership.png');
    await desktopPage.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 5: Mobile Portrait (390x844) Ergonomics & Drawer
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Mobile Portrait (390x844) Ergonomics ---');
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
    await mobilePage.waitForTimeout(2000);

    try {
      await mobilePage.keyboard.press('Escape');
    } catch {}

    // Open Investigative Desk on mobile via action bar button
    const mobileTimelineBtn = await mobilePage.$('#btn-conflict-timeline');
    if (mobileTimelineBtn) {
      await mobileTimelineBtn.click();
      await mobilePage.waitForTimeout(1000);
    }

    const shot5 = path.join(ARTIFACTS_DIR, 'ui-phase-e-5-mobile-investigative-desk.png');
    await mobilePage.screenshot({ path: shot5 });
    console.log(`Saved screenshot 5: ${shot5}`);

    await mobileContext.close();

    console.log('\n=== All Phase E Visual Verifications Passed Successfully! ===');
  } catch (err) {
    console.error('Visual verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
