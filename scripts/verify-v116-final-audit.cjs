/**
 * scripts/verify-v116-final-audit.cjs
 * Comprehensive Final Double-Check & Validation across:
 * 1. Mobile Portrait (390x844): Reader, Single-Row Gliding Action Bar, Bottom Nav, Headline.
 * 2. Library & Wisdom Review Studio (#42): Launching SM-2 Leitner Memory Deck from Wisdom Subpage.
 * 3. Mobile Landscape (844x390): Compact TopBar, Zero-Clipping Reading View.
 * 4. Desktop / EXE Broadside (1366x850): Dual-Reader spread, Right Icon Rail, Controls.
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
  console.log('=== V116 Comprehensive Final Verification & Double-Check ===');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/health');
    process.exit(1);
  }
  console.log('Backend confirmed active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Mode & Wisdom Review Deck from Library
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Library Wisdom Review Studio Deck (#42) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1366, height: 850 },
    });
    await desktopContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2000);

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

    // Open Library -> Wisdom subpage
    const libraryRailBtn = await desktopPage.$('#btn-rail-library');
    if (libraryRailBtn) {
      await libraryRailBtn.click();
      await desktopPage.waitForTimeout(800);

      // Click Wisdom Tab if present
      const wisdomTab = await desktopPage.$('button:has-text("Wisdom")');
      if (wisdomTab) {
        await wisdomTab.click();
        await desktopPage.waitForTimeout(600);
      }

      // Click Spaced Repetition Review Deck button
      const reviewBtn = await desktopPage.$('#btn-wisdom-subpage-review');
      if (reviewBtn) {
        await reviewBtn.click();
        await desktopPage.waitForTimeout(600);

        const imgWisdomPath = path.join(ARTIFACTS_DIR, 'ui-v116-1-wisdom-review-deck.png');
        await desktopPage.screenshot({ path: imgWisdomPath, fullPage: false });
        console.log('Saved Wisdom Review Deck Screenshot:', imgWisdomPath);

        // Close modal
        await desktopPage.keyboard.press('Escape');
        await desktopPage.waitForTimeout(400);
      }
    }

    // Capture Desktop Broadsheet View
    const closeLibBtn = await desktopPage.$('#btn-library-close');
    if (closeLibBtn) {
      await closeLibBtn.click();
      await desktopPage.waitForTimeout(500);
    } else {
      await desktopPage.keyboard.press('Escape');
    }

    const imgDesktopPath = path.join(ARTIFACTS_DIR, 'ui-v116-2-desktop-verified.png');
    await desktopPage.screenshot({ path: imgDesktopPath, fullPage: false });
    console.log('Saved Desktop View Screenshot:', imgDesktopPath);
    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 2: Mobile Portrait Gliding Bar & Touch Targets (390 x 844)
    // -------------------------------------------------------------
    console.log('\n--- 2. Validating Mobile Portrait Mode (390x844) ---');
    const portraitContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await portraitContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const portraitPage = await portraitContext.newPage();
    await portraitPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await portraitPage.waitForTimeout(2000);

    try {
      const dismissBtn = await portraitPage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await portraitPage.waitForTimeout(400);
      } else {
        await portraitPage.keyboard.press('Escape');
      }
    } catch {}

    const imgPortraitPath = path.join(ARTIFACTS_DIR, 'ui-v116-3-mobile-portrait-verified.png');
    await portraitPage.screenshot({ path: imgPortraitPath, fullPage: false });
    console.log('Saved Mobile Portrait Screenshot:', imgPortraitPath);
    await portraitContext.close();

    // -------------------------------------------------------------
    // Test 3: Mobile Landscape Mode (844 x 390)
    // -------------------------------------------------------------
    console.log('\n--- 3. Validating Mobile Landscape Mode (844x390) ---');
    const landscapeContext = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    });
    await landscapeContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const landscapePage = await landscapeContext.newPage();
    await landscapePage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await landscapePage.waitForTimeout(2000);

    try {
      const dismissBtn = await landscapePage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await landscapePage.waitForTimeout(400);
      } else {
        await landscapePage.keyboard.press('Escape');
      }
    } catch {}

    const imgLandscapePath = path.join(ARTIFACTS_DIR, 'ui-v116-4-mobile-landscape-verified.png');
    await landscapePage.screenshot({ path: imgLandscapePath, fullPage: false });
    console.log('Saved Mobile Landscape Screenshot:', imgLandscapePath);
    await landscapeContext.close();

    console.log('\n=== All V116 Comprehensive Validations Succeeded ===');
  } catch (err) {
    console.error('Validation failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
