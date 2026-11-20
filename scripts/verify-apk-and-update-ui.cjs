const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyApkAndUpdateUI() {
  console.log('[Visual Validator] Launching Chromium to verify APK update UI...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader', '--no-sandbox']
  });

  const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Dismiss Missed News Modal if open
  const missedOverlay = page.locator('#missed-news-modal-overlay');
  if (await missedOverlay.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 1. Open Settings Dialog via keyboard comma
  console.log('Opening Unified Settings Dialog...');
  await page.keyboard.press(',');
  await page.waitForTimeout(1500);

  // Take screenshot of General settings with Edition & GitHub Updates desk
  const screenshot1 = path.join(ARTIFACT_DIR, 'ui-apk-1-settings-update-desk.png');
  await page.screenshot({ path: screenshot1 });
  console.log(`Saved screenshot 1: ${screenshot1}`);

  // Close Settings dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 2. Take desktop overview with current release status
  const screenshot2 = path.join(ARTIFACT_DIR, 'ui-apk-2-overview.png');
  await page.screenshot({ path: screenshot2 });
  console.log(`Saved screenshot 2: ${screenshot2}`);

  await browser.close();
  console.log('APK UI verification completed successfully.');
}

verifyApkAndUpdateUI().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
