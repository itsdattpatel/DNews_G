/**
 * scripts/verify-autodrop-dock.cjs
 * Visual validation for:
 * 1. Clean headline (broadsheet serif, no scramble animation)
 * 2. Active dock in normal curved circular grid state (bend > 0, full opacity)
 * 3. Dropped flat dock when idle for > 2.5s (bend = 0, translated down, dimmed opacity)
 * 4. Hover wake-up (hovering smoothly brings it up to curved circular grid and full opacity)
 * 5. Settings dialog with Auto-Stow Delay slider and no scramble controls
 * 6. Theme matching with active theme
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

    // 1. Clean headline: ArticlePanel headline rendered without scramble animation
    console.log('[Visual Validator] 1. Capturing clean broadsheet headline & initial active dock...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-autodrop-1-clean-headline.png'),
      fullPage: false
    });

    // 2. Active dock: press 'j' to wake it and see active circular curved grid
    console.log('[Visual Validator] 2. Pressing "j" to wake dock into active curved grid...');
    await page.keyboard.press('j');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-autodrop-2-active-dock.png'),
      fullPage: false
    });

    // 3. Wait 3.5s (greater than the default 2.5s idle threshold) without user interaction
    console.log('[Visual Validator] 3. Waiting 3.5s for dock to auto-drop and flatten into straight line...');
    // Ensure mouse is not hovering over the dock
    await page.mouse.move(100, 100);
    await page.waitForTimeout(3600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-autodrop-3-dropped-flat-dock.png'),
      fullPage: false
    });

    // 4. Hover over the dock area at bottom center (x: 720, y: 840) to wake it up smoothly
    console.log('[Visual Validator] 4. Hovering mouse over dock to trigger smooth wake-up...');
    await page.mouse.move(720, 840);
    await page.waitForTimeout(900); // Allow smooth transition
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-autodrop-4-hover-wake.png'),
      fullPage: false
    });

    // 5. Open Settings modal to verify Auto-Stow Delay slider and clean Reading section
    console.log('[Visual Validator] 5. Opening Unified Settings dialog...');
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(1000);

    const readingTab = await page.$('#btn-settings-section-reading');
    if (readingTab) {
      console.log('[Visual Validator] Clicking Reading section tab...');
      await readingTab.click();
      await page.waitForTimeout(800);
    }

    // Scroll to the Orbit Wire Gallery Tuning section where Auto-Stow delay is located
    await page.evaluate(() => {
      const el = document.getElementById('slider-gallery-autodrop');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-autodrop-5-settings-slider.png'),
      fullPage: false
    });

    // 6. Close settings, toggle Dark/Night mode, and capture theme matched dock
    console.log('[Visual Validator] 6. Closing settings and switching to Night mode...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const themeToggleBtn = await page.$('#btn-rail-theme');
    if (themeToggleBtn) {
      await themeToggleBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wake the dock in dark mode
    await page.keyboard.press('j');
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-autodrop-6-theme-matched.png'),
      fullPage: false
    });

    console.log('[Visual Validator] All 6 screenshots successfully captured!');
  } catch (err) {
    console.error('[Visual Validator] Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
