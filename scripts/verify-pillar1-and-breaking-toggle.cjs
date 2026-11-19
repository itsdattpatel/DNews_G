/**
 * scripts/verify-pillar1-and-breaking-toggle.cjs
 * Visual validation for:
 * 1. Breaking News Notifications ON/OFF toggle in Settings
 * 2. Acoustic Audio Volume slider and Teletype audio toggle
 * 3. Auto-Advance countdown indicator on active dock card
 * 4. Quick-Peek floating broadsheet tooltip when hovering over an unfocused 3D card
 */
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function run() {
  console.log('[Visual Validator] Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  try {
    console.log('[Visual Validator] Navigating to http://127.0.0.1:5173...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Dismiss Missed News Modal or welcome toast if present
    const missedOverlay = page.locator('#missed-news-modal-overlay');
    if (await missedOverlay.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 1. Open Settings modal to verify Breaking News Notifications Toggle and Audio Controls
    console.log('[Visual Validator] 1. Opening Unified Settings dialog...');
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(1000);

    const alertsTab = await page.$('#btn-settings-section-alerts');
    if (alertsTab) {
      console.log('[Visual Validator] Clicking Alerts & Audio tab...');
      await alertsTab.click();
      await page.waitForTimeout(800);
    }

    console.log('[Visual Validator] Capturing 1: Alerts settings with Breaking Notifications & Audio controls...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-pillar1-1-settings-breaking-notifications-toggle.png'),
      fullPage: false
    });

    // 2. Click the Breaking News Notifications button to turn it OFF
    const toggleBreakingBtn = await page.$('#btn-toggle-breaking-notifications');
    if (toggleBreakingBtn) {
      console.log('[Visual Validator] Clicking #btn-toggle-breaking-notifications to turn OFF...');
      await toggleBreakingBtn.click();
      await page.waitForTimeout(500);
    }

    console.log('[Visual Validator] Capturing 2: Breaking news notifications turned OFF...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-pillar1-2-breaking-notifications-turned-off.png'),
      fullPage: false
    });

    // Close settings modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    // 3. Turn on Auto-Advance to verify Auto-Advance Countdown Indicator on active card
    console.log('[Visual Validator] 3. Toggling Auto-Advance ON to verify active card countdown bar...');
    const autoAdvanceBtn = await page.$('#btn-auto-advance-toggle');
    if (autoAdvanceBtn) {
      await autoAdvanceBtn.click();
      await page.waitForTimeout(1600); // Allow progress bar to fill ~20-30%
    }

    console.log('[Visual Validator] Capturing 3: Auto-Advance countdown progress indicator on dock...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-pillar1-3-autoadvance-countdown-indicator.png'),
      fullPage: false
    });

    // 4. Hover over a card in the 3D dock to trigger the Quick-Peek broadsheet tooltip
    console.log('[Visual Validator] 4. Hovering mouse over card to trigger Quick-Peek tooltip...');
    // Wake dock first by moving mouse into active dock area
    await page.mouse.move(720, 800);
    await page.waitForTimeout(300);
    // Move to card at x: 950, y: 810
    await page.mouse.move(950, 810);
    await page.waitForTimeout(700); // Allow debounce

    console.log('[Visual Validator] Capturing 4: Quick-Peek broadsheet floating card tooltip...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-pillar1-4-quickpeek-hover-tooltip.png'),
      fullPage: false
    });

    console.log('[Visual Validator] All visual verification screenshots captured successfully!');
  } catch (err) {
    console.error('[Visual Validator] Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
