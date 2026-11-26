/**
 * scripts/verify-phase-g-broadcast.cjs
 * Visual validation for Phase G: Broadcast, Audio & Media Synthesis (Features 21-28).
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
  console.log('=== Phase G Visual Verification: Broadcast, Audio & Media Synthesis ===');

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
    // Test 1: Desktop Mode & Phase G Action Bar Buttons + CAP Banner
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop Action Bar with Broadcast Desk Buttons & CAP Banner ---');
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

    // Take screenshot 1: Desktop with new action bar buttons and CAP alert banner
    const shot1 = path.join(ARTIFACTS_DIR, 'ui-phase-g-1-desktop-actionbar.png');
    await desktopPage.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // -------------------------------------------------------------
    // Test 2: Two-Host Radio Podcast Tab (#21)
    // -------------------------------------------------------------
    console.log('\n--- 2. Opening Broadcast Desk (Two-Host Radio Podcast Tab) ---');
    const podcastBtn = await desktopPage.$('#btn-broadcast-podcast');
    if (podcastBtn) {
      await podcastBtn.click();
      await desktopPage.waitForTimeout(1200);
    } else {
      await desktopPage.keyboard.press('m');
      await desktopPage.waitForTimeout(1200);
    }

    const shot2 = path.join(ARTIFACTS_DIR, 'ui-phase-g-2-two-host-podcast.png');
    await desktopPage.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    // -------------------------------------------------------------
    // Test 3: Pressroom Soundscapes Tab (#24)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Procedural Pressroom Soundscapes Tab ---');
    const soundscapeTab = desktopPage.locator('nav[aria-label="Broadcast Desks"] button:has-text("Press Soundscapes")');
    if (await soundscapeTab.count() > 0) {
      await soundscapeTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1200);
    }

    const shot3 = path.join(ARTIFACTS_DIR, 'ui-phase-g-3-pressroom-soundscapes.png');
    await desktopPage.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    // -------------------------------------------------------------
    // Test 4: 60s Reel Generator Tab (#26)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing 60-Second Video Reel Generator Tab & Canvas Preview ---');
    const reelTab = desktopPage.locator('nav[aria-label="Broadcast Desks"] button:has-text("60s Reel")');
    if (await reelTab.count() > 0) {
      await reelTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1500);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-phase-g-4-60s-reel-canvas.png');
    await desktopPage.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    // Close desktop dialog
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);
    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 5: Mobile Mode (Portrait 390x844) & Broadcast Soundstage
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

    // Open Broadcast Media Desk via button or keyboard
    const mobileBroadcastBtn = await mobilePage.$('#btn-broadcast-desk');
    if (mobileBroadcastBtn) {
      await mobileBroadcastBtn.click();
      await mobilePage.waitForTimeout(1200);
    } else {
      await mobilePage.keyboard.press('m');
      await mobilePage.waitForTimeout(1200);
    }

    const shot5 = path.join(ARTIFACTS_DIR, 'ui-phase-g-5-mobile-broadcast-desk.png');
    await mobilePage.screenshot({ path: shot5 });
    console.log(`Saved screenshot 5: ${shot5}`);

    await mobileContext.close();
    console.log('\n=== All Phase G Visual Validation Screenshots Captured Successfully! ===');
  } catch (err) {
    console.error('Visual verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
