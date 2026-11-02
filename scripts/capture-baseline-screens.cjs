const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASELINE_DIR = path.resolve(__dirname, '../playwright-screenshots/baseline');
if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
}

const FIXTURE_PATH = path.resolve(__dirname, '../playwright-screenshots/articles-fixture.json');
let fixtureData = null;
if (fs.existsSync(FIXTURE_PATH)) {
  fixtureData = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
}

async function captureBaselines() {
  console.log('[Baseline Capture] Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addInitScript(() => {
    sessionStorage.setItem('missed_news_dismissed', 'true');
    localStorage.setItem('missed_news_dismissed', 'true');
  });

  const page = await context.newPage();

  if (fixtureData) {
    await page.route('**/api/articles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureData)
      });
    });
  }

  console.log('[Baseline Capture] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Main Reader - Paper
  await page.screenshot({ path: path.join(BASELINE_DIR, '01-main-reader-paper.png') });
  console.log('  Saved: 01-main-reader-paper.png');

  // 2. Bat Menu open
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
    if (store?.setSettingsOpen) store.setSettingsOpen(true);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(BASELINE_DIR, '06-settings-drawer.png') });
  console.log('  Saved: 06-settings-drawer.png');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setSettingsOpen) store.setSettingsOpen(false);
  });
  await page.waitForTimeout(500);

  // 7. Control Room
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setControlRoomOpen) store.setControlRoomOpen(true);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, '07-control-room.png') });
  console.log('  Saved: 07-control-room.png');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setControlRoomOpen) store.setControlRoomOpen(false);
  });
  await page.waitForTimeout(500);

  // 8. PDF Desk
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setPdfOpen) store.setPdfOpen(true);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, '08-pdf-desk.png') });
  console.log('  Saved: 08-pdf-desk.png');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setPdfOpen) store.setPdfOpen(false);
  });
  await page.waitForTimeout(500);

  await browser.close();
  console.log('[Baseline Capture] Completed successfully. 8 baseline screens stored in playwright-screenshots/baseline.\n');
}

captureBaselines().catch((err) => {
  console.error('[Baseline Capture Failed]', err);
  process.exit(1);
});
