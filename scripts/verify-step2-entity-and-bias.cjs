const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep2() {
  console.log('[Step 2] Launching Chromium...');
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

  // 1. Check for Entity Dossier Bar in Article Panel
  console.log('Locating #entity-dossier-bar in Article Panel...');
  const entityBar = await page.waitForSelector('#entity-dossier-bar', { timeout: 10000 });
  if (entityBar) {
    console.log('Entity dossier bar found!');
    const screenshot1 = path.join(ARTIFACT_DIR, 'ui-step2-1-article-entity-bar.png');
    await page.screenshot({ path: screenshot1 });
    console.log(`Saved screenshot 1: ${screenshot1}`);
  }

  // 2. Click the first entity badge to open the Confidential Dossier Drawer
  console.log('Clicking first entity badge in dossier bar...');
  const firstBadge = await page.waitForSelector('button[id^="btn-entity-dossier-"]', { timeout: 5000 });
  if (firstBadge) {
    const badgeText = await firstBadge.textContent();
    console.log(`Clicking badge: ${badgeText.trim()}`);
    await firstBadge.click();
    await page.waitForTimeout(2000);

    const drawer = await page.waitForSelector('#entity-dossier-drawer', { timeout: 8000 });
    if (drawer) {
      console.log('Dossier drawer opened!');
      const screenshot2 = path.join(ARTIFACT_DIR, 'ui-step2-2-entity-dossier-drawer.png');
      await page.screenshot({ path: screenshot2 });
      console.log(`Saved screenshot 2: ${screenshot2}`);
    }

    // Close the drawer
    const closeBtn = await page.$('#btn-close-entity-dossier');
    if (closeBtn) {
      console.log('Closing drawer...');
      await closeBtn.click();
      await page.waitForTimeout(800);
    }
  }

  // 3. Open Compare Coverage with cluster 5773 and check Cross-Outlet Bias & Claim Radar
  console.log('Opening Compare Coverage view for cluster 5773...');
  await page.evaluate(() => {
    const state = window.useAppStore ? window.useAppStore.getState() : null;
    if (state) {
      state.setCompareClusterId(5773);
    }
  });

  await page.waitForTimeout(2500);
  const biasRadar = await page.waitForSelector('#compare-bias-radar', { timeout: 8000 });
  if (biasRadar) {
    console.log('Bias radar found in Compare Coverage!');
  }

  const screenshot3 = path.join(ARTIFACT_DIR, 'ui-step2-3-compare-bias-radar.png');
  await page.screenshot({ path: screenshot3 });
  console.log(`Saved screenshot 3: ${screenshot3}`);

  await browser.close();
  console.log('Verification finished successfully.');
}

verifyStep2().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
