/**
 * scripts/verify-refinement-dock.cjs
 * Visual validation for:
 * 1. Pure floating 3D dock with NO background container and NO backdrop blur
 * 2. Story advance with ZERO white flashing on focused/last-focused cards
 * 3. Expanded Orbit Wire Gallery controls in Unified Settings Dialog
 * 4. Night Mode verification
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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

    // 1. Initial view: Pure floating 3D dock over reader desk
    console.log('[Visual Validator] Capturing 1: Pure floating 3D dock...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-refine-1-pure-floating-dock.png'),
      fullPage: false
    });

    // 2. Advance story using 'j' key to verify smooth rotation with no white flashing
    console.log('[Visual Validator] Pressing "j" to advance story...');
    await page.keyboard.press('j');
    await page.waitForTimeout(600); // During transition
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-refine-2-story-transition.png'),
      fullPage: false
    });
    await page.waitForTimeout(800); // Fully settled

    // 3. Open Settings dialog and navigate to Reading tab
    console.log('[Visual Validator] Opening Settings modal...');
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(1000);

    // Click Reading section tab
    const readingTab = await page.$('#btn-settings-section-reading');
    if (readingTab) {
      console.log('[Visual Validator] Clicking Reading tab...');
      await readingTab.click();
      await page.waitForTimeout(800);
    }

    // Scroll to the Orbit Wire Gallery Tuning section
    await page.evaluate(() => {
      const el = document.getElementById('slider-gallery-bend');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(600);

    console.log('[Visual Validator] Capturing 3: Expanded gallery settings...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-refine-3-expanded-settings.png'),
      fullPage: false
    });

    // 4. Toggle Night Mode using rail theme switcher
    console.log('[Visual Validator] Closing settings and toggling Dark mode...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const themeToggleBtn = await page.$('#btn-rail-theme');
    if (themeToggleBtn) {
      console.log('[Visual Validator] Clicking #btn-rail-theme for Dark mode...');
      await themeToggleBtn.click();
      await page.waitForTimeout(1000);
    }

    console.log('[Visual Validator] Capturing 4: Night mode pure floating dock...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-refine-4-night-mode-dock.png'),
      fullPage: false
    });

    console.log('[Visual Validator] All visual verification screenshots captured successfully!');
  } catch (err) {
    console.error('[Visual Validator] Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
