const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep3() {
  console.log('[Step 3] Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader', '--no-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Dismiss Missed News Modal if open
  const missedOverlay = page.locator('#missed-news-modal-overlay');
  if (await missedOverlay.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 1. Verify Classic Broadsheet Layout
  console.log('Testing Classic Broadsheet layout...');
  const btnBroadsheet = await page.waitForSelector('#btn-layout-broadsheet', { timeout: 8000 });
  if (btnBroadsheet) {
    await btnBroadsheet.click();
    await page.waitForTimeout(1000);
    const screenshot1 = path.join(ARTIFACT_DIR, 'ui-step3-1-broadsheet-layout.png');
    await page.screenshot({ path: screenshot1 });
    console.log(`Saved screenshot 1: ${screenshot1}`);
  }

  // 2. Verify Wire Terminal Layout
  console.log('Testing Wire Terminal layout...');
  const btnWire = await page.waitForSelector('#btn-layout-wire', { timeout: 5000 });
  if (btnWire) {
    await btnWire.click();
    await page.waitForTimeout(1000);
    const wireHeader = await page.waitForSelector('#wire-terminal-headline-box', { timeout: 5000 });
    if (wireHeader) {
      console.log('Wire terminal header active!');
    }
    const screenshot2 = path.join(ARTIFACT_DIR, 'ui-step3-2-wire-terminal-layout.png');
    await page.screenshot({ path: screenshot2 });
    console.log(`Saved screenshot 2: ${screenshot2}`);
  }

  // 3. Verify Photojournalism Magazine Layout
  console.log('Testing Photojournalism Magazine layout...');
  const btnPhoto = await page.waitForSelector('#btn-layout-photojournalism', { timeout: 5000 });
  if (btnPhoto) {
    await btnPhoto.click();
    await page.waitForTimeout(1000);
    const photoHeader = await page.waitForSelector('#photojournalism-layout-header', { timeout: 5000 });
    if (photoHeader) {
      console.log('Photojournalism layout header active!');
    }
    const screenshot3 = path.join(ARTIFACT_DIR, 'ui-step3-3-photojournalism-layout.png');
    await page.screenshot({ path: screenshot3 });
    console.log(`Saved screenshot 3: ${screenshot3}`);
  }

  // 4. Verify Custom RSS & Channel Manager Desk & Live Feed Testing
  console.log('Opening Sources & News Desk...');
  await page.evaluate(() => {
    if (window.useAppStore) {
      window.useAppStore.getState().setSourcesOpen(true);
    }
  });
  await page.waitForTimeout(1500);

  const btnOpenAddSource = await page.waitForSelector('#btn-open-add-custom-source-modal', { timeout: 8000 });
  if (btnOpenAddSource) {
    console.log('Clicking Register Custom Wire button...');
    await btnOpenAddSource.click();
    await page.waitForTimeout(1000);

    const modal = await page.waitForSelector('#add-custom-source-modal', { timeout: 5000 });
    if (modal) {
      console.log('Add Custom Source modal opened!');
      const urlInput = await page.$('#custom-source-url-input');
      if (urlInput) {
        await urlInput.fill('https://feeds.bbci.co.uk/news/world/rss.xml');
        await page.waitForTimeout(300);

        const btnTest = await page.$('#btn-test-feed');
        if (btnTest) {
          console.log('Clicking Test Feed button...');
          await btnTest.click();
          // Wait for test preview card
          await page.waitForSelector('#custom-source-test-preview', { timeout: 15000 });
          await page.waitForTimeout(2000);
        }
      }

      const screenshot4 = path.join(ARTIFACT_DIR, 'ui-step3-4-custom-source-modal-tested.png');
      await page.screenshot({ path: screenshot4 });
      console.log(`Saved screenshot 4: ${screenshot4}`);

      // Close modal
      const btnClose = await page.$('#btn-close-custom-source-modal');
      if (btnClose) await btnClose.click();
      await page.waitForTimeout(500);
    }

    // Close sources desk
    const btnCloseSources = await page.$('#btn-close-sources-desk');
    if (btnCloseSources) await btnCloseSources.click();
  }

  // Restore broadsheet layout for clean resting state
  if (btnBroadsheet) {
    await btnBroadsheet.click();
  }

  await browser.close();
  console.log('Verification finished successfully.');
}

verifyStep3().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
