const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory9() {
  console.log('[Verify Cat 9] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 9] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Close any startup catch-up modal
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
    }
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 1. Paper Edition — Select confirmed breaking article 186917 (Cluster 3355: 4 outlets in 2 countries)
  console.log('[Verify Cat 9] Step 1: Selecting article 186917 (Cluster 3355: 4 outlets in 2 countries) in Paper Edition...');
  await page.evaluate(async () => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
      store.setTheme('paper');
      store.setCurrentView('reader');
      await store.selectArticleById(186917);
    }
  });
  await page.waitForTimeout(1000);

  // Capture Screenshot 1: Paper Edition — Reader with Confirmed Breaking & Stamp, plus Card Strip
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step9-confirmation-cards-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 9] Captured Screenshot 1:', shot1);

  // 2. Night Edition Theme
  console.log('[Verify Cat 9] Step 2: Switching to Night Edition Theme...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
      store.setTheme('night');
    }
  });
  await page.waitForTimeout(1000);

  // Capture Screenshot 2: Night Edition — Reader Header with Confirmed Breaking Crimson Badge & Emerald Stamp
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step9-confirmation-reader-night.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 9] Captured Screenshot 2:', shot2);

  // 3. Category Rail View
  console.log('[Verify Cat 9] Step 3: Navigating to Category Rail View...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
      store.setCurrentView('category');
    }
  });
  await page.waitForTimeout(1500);

  // Capture Screenshot 3: Category Rail Grid with Confirmation Stamps
  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step9-confirmation-category-rail.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 9] Captured Screenshot 3:', shot3);

  // 4. Open Telegraph Alerts Center
  console.log('[Verify Cat 9] Step 4: Opening Telegraph Alerts Center...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
      store.setAlertsOpen(true);
    }
  });
  await page.waitForTimeout(1500);

  // Capture Screenshot 4: Alerts Center with Unconfirmed Breaking (amber) vs Confirmed Breaking (crimson)
  const shot4 = path.join(ARTIFACTS_DIR, 'ui-step9-confirmation-alerts.png');
  await page.screenshot({ path: shot4 });
  console.log('[Verify Cat 9] Captured Screenshot 4:', shot4);

  // 5. Open Compare Coverage Modal for Cluster 3355
  console.log('[Verify Cat 9] Step 5: Opening Compare Coverage desk for Cluster 3355...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
      store.setAlertsOpen(false);
      store.setCompareClusterId(3355);
    }
  });
  await page.waitForTimeout(1500);

  // Capture Screenshot 5: Compare Coverage Modal with Cluster Corroboration Badge
  const shot5 = path.join(ARTIFACTS_DIR, 'ui-step9-confirmation-compare-desk.png');
  await page.screenshot({ path: shot5 });
  console.log('[Verify Cat 9] Captured Screenshot 5:', shot5);

  await browser.close();
  console.log('[Verify Cat 9] Visual verification complete! All 5 screenshots saved.');
}

verifyCategory9().catch((err) => {
  console.error('[Verify Cat 9] Verification failed:', err);
  process.exit(1);
});
