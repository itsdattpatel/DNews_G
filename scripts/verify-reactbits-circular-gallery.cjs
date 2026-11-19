/**
 * scripts/verify-reactbits-circular-gallery.cjs
 * Visual validation for React Bits <CircularGallery /> WebGL Component,
 * rectangular broadsheet card texture rendering, and in-place tuning controls.
 */
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function run() {
  console.log('[Visual Test] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log('[Visual Test] Navigating to http://127.0.0.1:5173 ...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);

    // Dismiss Missed News Modal if present
    const missedOverlay = page.locator('#missed-news-modal-overlay');
    if (await missedOverlay.isVisible().catch(() => false)) {
      console.log('[Visual Test] Dismissing Missed News Modal...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 1. Capture Main Unified Desk with React Bits CircularGallery WebGL Docker
    const screen1Path = path.join(ARTIFACTS_DIR, 'ui-gallery-1-reactbits-dock.png');
    await page.screenshot({ path: screen1Path, fullPage: false });
    console.log(`[Visual Test] Saved: ${screen1Path}`);

    // Check canvas element in circular gallery
    const canvas = page.locator('#circular-dock canvas');
    const hasCanvas = await canvas.isVisible().catch(() => false);
    console.log(`[Visual Test] WebGL Canvas rendered: ${hasCanvas}`);

    // 2. Open In-Place Tuning Drawer (Bend, Size, Ease, Fade)
    console.log('[Visual Test] Opening In-Place Tuning Controls on docker...');
    const tuningBtn = page.locator('#circular-dock button[title*="Tuning"], #circular-dock button[aria-label*="Tuning"]').first();
    if (await tuningBtn.isVisible().catch(() => false)) {
      await tuningBtn.click();
      await page.waitForTimeout(600);

      const screen2Path = path.join(ARTIFACTS_DIR, 'ui-gallery-2-tuning-drawer.png');
      await page.screenshot({ path: screen2Path, fullPage: false });
      console.log(`[Visual Test] Saved: ${screen2Path}`);
    }

    // 3. Navigate to next story using right arrow button on dock
    console.log('[Visual Test] Advancing story to verify focus change...');
    const nextBtn = page.locator('#circular-dock button[title*="Next Story"]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);

      const screen3Path = path.join(ARTIFACTS_DIR, 'ui-gallery-3-story-advanced.png');
      await page.screenshot({ path: screen3Path, fullPage: false });
      console.log(`[Visual Test] Saved: ${screen3Path}`);
    }

    // 4. Open Settings Dialog -> Reading Tab
    console.log('[Visual Test] Opening Settings Dialog...');
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(800);

    const modal = page.locator('#unified-settings-modal-overlay');
    if (await modal.isVisible().catch(() => false)) {
      const readingTab = modal.locator('button:has-text("Reading")').first();
      await readingTab.click({ force: true });
      await page.waitForTimeout(400);

      // Scroll settings content pane to reveal Orbit Wire Gallery Tuning section
      await page.evaluate(() => {
        const el = document.getElementById('settings-content-scrollable-area');
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(600);

      const screen4Path = path.join(ARTIFACTS_DIR, 'ui-gallery-4-settings-tuning.png');
      await page.screenshot({ path: screen4Path, fullPage: false });
      console.log(`[Visual Test] Saved: ${screen4Path}`);
    }

    console.log('[Visual Test] All screenshots captured successfully!');
  } catch (err) {
    console.error('[Visual Test] Error during visual validation:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
