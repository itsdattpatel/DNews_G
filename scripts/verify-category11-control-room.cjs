const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/a11d82f3-5f26-4b25-a621-23dfc75c6e43';

async function verifyCategory11() {
  console.log('[Verify Cat 11] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 11] Navigating to http://localhost:5173...');
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

  // 1. Open Control Room via store / button
  console.log('[Verify Cat 11] Opening Control Room Desk in Paper Edition...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setTheme('paper');
      store.setControlRoomOpen(true);
    }
  });
  await page.waitForTimeout(1500);

  // Verify desk container is visible
  const desk = await page.$('#control-room-desk');
  if (!desk) {
    throw new Error('Control Room Desk element (#control-room-desk) not found in DOM!');
  }

  // 2. Capture Overview in Paper Edition
  const overviewPath = path.join(ARTIFACTS_DIR, 'ui-step11-control-room-overview-paper.png');
  await page.screenshot({ path: overviewPath });
  console.log('[Verify Cat 11] Saved:', overviewPath);

  // 3. Switch to Sources Freshness Matrix tab
  console.log('[Verify Cat 11] Inspecting Sources Freshness Matrix tab...');
  const sourcesTab = await page.$('#tab-control-room-sources');
  if (sourcesTab) {
    await sourcesTab.click();
    await page.waitForTimeout(800);
    const sourcesPath = path.join(ARTIFACTS_DIR, 'ui-step11-control-room-sources.png');
    await page.screenshot({ path: sourcesPath });
    console.log('[Verify Cat 11] Saved:', sourcesPath);
  }

  // 4. Switch to Scheduler & Queues tab
  console.log('[Verify Cat 11] Inspecting Scheduler & Queues tab...');
  const queuesTab = await page.$('#tab-control-room-scheduler-queues');
  if (queuesTab) {
    await queuesTab.click();
    await page.waitForTimeout(800);
    const queuesPath = path.join(ARTIFACTS_DIR, 'ui-step11-control-room-scheduler-queues.png');
    await page.screenshot({ path: queuesPath });
    console.log('[Verify Cat 11] Saved:', queuesPath);
  }

  // 5. Switch to AI Quotas tab
  console.log('[Verify Cat 11] Inspecting AI Providers & Quotas tab...');
  const quotasTab = await page.$('#tab-control-room-ai-quotas');
  if (quotasTab) {
    await quotasTab.click();
    await page.waitForTimeout(800);
    const quotasPath = path.join(ARTIFACTS_DIR, 'ui-step11-control-room-ai-quotas.png');
    await page.screenshot({ path: quotasPath });
    console.log('[Verify Cat 11] Saved:', quotasPath);
  }

  // 6. Switch to Error Ledger tab
  console.log('[Verify Cat 11] Inspecting Error Ledger tab...');
  const errorsTab = await page.$('#tab-control-room-errors');
  if (errorsTab) {
    await errorsTab.click();
    await page.waitForTimeout(800);
    const errorsPath = path.join(ARTIFACTS_DIR, 'ui-step11-control-room-errors.png');
    await page.screenshot({ path: errorsPath });
    console.log('[Verify Cat 11] Saved:', errorsPath);
  }

  // 7. Night Edition Mode
  console.log('[Verify Cat 11] Switching to Night Edition mode...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setTheme('night');
    }
  });
  // Switch back to overview tab for Night Edition screenshot
  const overviewTab = await page.$('#tab-control-room-overview');
  if (overviewTab) {
    await overviewTab.click();
  }
  await page.waitForTimeout(1000);

  const nightPath = path.join(ARTIFACTS_DIR, 'ui-step11-control-room-night.png');
  await page.screenshot({ path: nightPath });
  console.log('[Verify Cat 11] Saved:', nightPath);

  // 8. Test Bat Menu item visibility
  console.log('[Verify Cat 11] Verifying Bat Menu navigation entry...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setControlRoomOpen(false);
      store.setBatMenuOpen(true);
    }
  });
  await page.waitForTimeout(800);
  const batMenuPath = path.join(ARTIFACTS_DIR, 'ui-step11-bat-menu-control-room.png');
  await page.screenshot({ path: batMenuPath });
  console.log('[Verify Cat 11] Saved:', batMenuPath);

  await browser.close();
  console.log('[Verify Cat 11] All visual validations completed successfully.');
}

verifyCategory11().catch((err) => {
  console.error('[Verify Cat 11] Verification failed:', err);
  process.exit(1);
});

