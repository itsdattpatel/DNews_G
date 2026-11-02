const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASELINE_DIR = path.resolve(__dirname, '../playwright-screenshots/baseline');
if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
}

async function captureBaselines() {
  console.log('[Baseline Capture] Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('[Baseline Capture] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Ensure any startup/welcome modal backdrop is cleanly dismissed for consistent baseline
  await page.evaluate(() => {
    sessionStorage.setItem('missed_news_dismissed', 'true');
    localStorage.setItem('missed_news_dismissed', 'true');
    const store = window.useAppStore?.getState();
    if (store?.setMissedNewsModalOpen) store.setMissedNewsModalOpen(false);
    if (store?.dismissWelcomeBack) store.dismissWelcomeBack();
  });
  await page.waitForTimeout(500);

  // 1. Main Reader - Paper
  await page.screenshot({ path: path.join(BASELINE_DIR, '01-main-reader-paper.png') });
  console.log('  Saved: 01-main-reader-paper.png');

  // 2. Bat Menu open
  const batBtn = page.locator('button[aria-label*="navigation" i], button:has(svg)').first();
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(BASELINE_DIR, '02-bat-menu.png') });
  console.log('  Saved: 02-bat-menu.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. Main Reader - Night
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'night');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(BASELINE_DIR, '03-main-reader-night.png') });
  console.log('  Saved: 03-main-reader-night.png');
  // Revert to paper
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(300);

  // 4. Globe View
  await page.keyboard.press('KeyG');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(BASELINE_DIR, '04-globe-view.png') });
  console.log('  Saved: 04-globe-view.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 5. TV Desk
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(BASELINE_DIR, '05-tv-desk.png') });
  console.log('  Saved: 05-tv-desk.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 6. Settings Drawer
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.openSettings) store.openSettings();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(BASELINE_DIR, '06-settings-drawer.png') });
  console.log('  Saved: 06-settings-drawer.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 7. Control Room
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setActiveOverlay) store.setActiveOverlay('control-room');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, '07-control-room.png') });
  console.log('  Saved: 07-control-room.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 8. PDF Desk
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setActiveOverlay) store.setActiveOverlay('pdf');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, '08-pdf-desk.png') });
  console.log('  Saved: 08-pdf-desk.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await browser.close();
  console.log('[Baseline Capture] Completed all 8 baseline screenshots successfully.');
}

captureBaselines().catch(err => {
  console.error('[Baseline Capture Failed]', err);
  process.exit(1);
});
