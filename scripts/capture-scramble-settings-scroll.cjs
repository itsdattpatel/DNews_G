const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Dismiss Missed News Modal
    const missedOverlay = page.locator('#missed-news-modal-overlay');
    if (await missedOverlay.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // Open Settings
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(800);

    const modal = page.locator('#unified-settings-modal-overlay');
    if (await modal.isVisible().catch(() => false)) {
      const readingTab = modal.locator('button:has-text("Reading")').first();
      await readingTab.click({ force: true });
      await page.waitForTimeout(400);

      // Scroll #settings-content-scrollable-area to bottom
      await page.evaluate(() => {
        const el = document.getElementById('settings-content-scrollable-area');
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(600);
    }

    const screenPath = path.join(ARTIFACTS_DIR, 'ui-dock-4-scramble-controls-scrolled.png');
    await page.screenshot({ path: screenPath, fullPage: false });
    console.log(`Saved scrolled settings screenshot: ${screenPath}`);
  } finally {
    await browser.close();
  }
}

run();
